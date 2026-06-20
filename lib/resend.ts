import { Resend } from "resend"

type InviteEmail = {
  to: string
  inviterName: string
  organizationName: string
  departmentName: string
  roleLabel: string
  inviteUrl: string
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
