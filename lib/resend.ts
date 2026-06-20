import { Resend } from "resend"

type InviteEmail = {
  to: string
  inviterName: string
  organizationName: string
  departmentName: string
  roleLabel: string
  inviteUrl: string
}

type HighRiskAlertEmail = {
  to: string
  patientId: string
  studyUrl: string
  riskScore: number
  topFinding: string
  organizationName: string
}

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.")
  }

  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendInviteEmail({
  to,
  inviterName,
  organizationName,
  departmentName,
  roleLabel,
  inviteUrl,
}: InviteEmail) {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured.")
  }

  return getResend().emails.send({
    from,
    to,
    subject: `Join ${organizationName} on Radiant`,
    text: `${inviterName} invited you to join ${organizationName}'s ${departmentName} department as ${roleLabel}. Sign in with Google to accept: ${inviteUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="font-size: 22px;">Join ${organizationName} on Radiant</h1>
        <p>${inviterName} invited you to join the <strong>${departmentName}</strong> department as <strong>${roleLabel}</strong>.</p>
        <p>Use your organization Google account to sign in and complete onboarding.</p>
        <p>
          <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
            Accept invite
          </a>
        </p>
        <p style="font-size: 12px; color: #6b7280;">This invite expires in 7 days.</p>
      </div>
    `,
  })
}

export async function sendHighRiskAlertEmail({
  to,
  patientId,
  studyUrl,
  riskScore,
  topFinding,
  organizationName,
}: HighRiskAlertEmail) {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured.")
  }

  return getResend().emails.send({
    from,
    to,
    subject: `High-risk Radiant record for ${patientId}`,
    text: `${organizationName} has a high-risk Radiant case record for client ${patientId}. Risk score: ${riskScore}%. Top finding: ${topFinding}. Review it here: ${studyUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="font-size: 22px;">High-risk Radiant record</h1>
        <p><strong>${organizationName}</strong> has a high-risk imaging case record ready for review.</p>
        <p><strong>Client:</strong> ${patientId}<br /><strong>Risk score:</strong> ${riskScore}%<br /><strong>Top finding:</strong> ${topFinding}</p>
        <p>
          <a href="${studyUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
            Review record
          </a>
        </p>
        <p style="font-size: 12px; color: #6b7280;">AI-assisted output is not a clinical diagnosis. Radiologist review is required.</p>
      </div>
    `,
  })
}
