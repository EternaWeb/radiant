import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessRecord } from "@/lib/case-access"
import { mapRecordRow } from "@/lib/case-mappers"
import { clientDisplayName } from "@/lib/cases"
import { formatFindingLabel, formatFindingZone } from "@/lib/lung-zones"
import { recordSelect } from "@/lib/case-queries"

type Context = {
  params: Promise<{ id: string }>
}

type PdfPage = {
  lines: string[]
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function wrapText(value: string, maxLength = 86) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean)
  const lines: string[] = []
  let line = ""

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxLength) {
      if (line) lines.push(line)
      line = word
    } else {
      line = next
    }
  }

  if (line) lines.push(line)
  return lines.length ? lines : [""]
}

function addSection(lines: string[], title: string, body: string) {
  lines.push("", title.toUpperCase())
  lines.push(...wrapText(body))
}

function buildPdf(lines: string[]) {
  const pageLineLimit = 52
  const pages: PdfPage[] = []
  for (let index = 0; index < lines.length; index += pageLineLimit) {
    pages.push({ lines: lines.slice(index, index + pageLineLimit) })
  }

  const objects: string[] = []
  const pageObjectIds = pages.map((_, index) => 4 + index * 2)
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>"
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"

  pages.forEach((page, index) => {
    const pageObjectId = 4 + index * 2
    const contentObjectId = pageObjectId + 1
    const text = [
      "BT",
      "/F1 10 Tf",
      "50 792 Td",
      ...page.lines.map((line, lineIndex) => `${lineIndex === 0 ? "" : "0 -14 Td "}${`(${escapePdfText(line)}) Tj`}`),
      "ET",
    ].join("\n")

    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    objects[contentObjectId - 1] = `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`
  })

  let pdf = "%PDF-1.4\n"
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf)
}

export async function GET(_request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  if (!(await canAccessRecord(auth, id))) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 })
  }

  const { data, error } = await (auth.service.from("case_records") as any)
    .select(
      `
      ${recordSelect},
      cases(title, clients(*))
    `,
    )
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Record not found." }, { status: 404 })
  }

  const record = await mapRecordRow(auth.service, data)
  const raw = data as any
  const client = raw.cases?.clients
  const patientName = client ? clientDisplayName(client) : "Unknown patient"
  const caseTitle = raw.cases?.title ?? "Case"
  const findings = record.findings
    .map((finding) => `${formatFindingLabel(finding.label)} (${formatFindingZone(finding.zone)}, ${finding.confidence}%)`)
    .join("; ") || "No findings recorded."

  const lines = [
    "Radiant Record Report",
    "",
    `Patient: ${patientName}`,
    `Patient ID: ${client?.client_code ?? "Unknown"}`,
    `Case: ${caseTitle}`,
    `Record: #${record.recordNumber}`,
    `Date: ${record.date}`,
    `Modality: ${record.modality} - ${record.bodyPart}`,
    `Risk: ${record.risk}% - ${record.status}`,
  ]

  addSection(lines, "Summary", record.summary)
  addSection(lines, "Findings", findings)
  addSection(lines, "Timeline comparison", record.comparison)
  addSection(lines, "Recommendation", record.recommendation)
  addSection(lines, "Disclaimer", record.disclaimer)

  const pdf = buildPdf(lines)
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="radiant-record-${record.recordNumber}.pdf"`,
    },
  })
}
