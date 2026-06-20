import { DiagnosticViewer } from "@/components/workspace/diagnostic-viewer"

type ViewerPageProps = {
  params: Promise<{ recordId: string }>
}

export default async function ViewerPage({ params }: ViewerPageProps) {
  const { recordId } = await params
  return <DiagnosticViewer recordId={recordId} />
}
