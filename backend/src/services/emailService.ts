import nodemailer from 'nodemailer'
import { logger } from '../utils/logger'

const smtpHost = process.env.SMTP_HOST
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM || 'Vertex <noreply@vertex.local>'

const configured = Boolean(smtpHost && smtpUser && smtpPass)

const transporter = configured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<{ sent: boolean; mode: 'smtp' | 'logged' }> {
  if (!to?.trim()) return { sent: false, mode: 'logged' }

  const bodyHtml = html ?? `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
    <p style="margin:0 0 12px;font-size:16px;font-weight:600">${subject}</p>
    <p style="margin:0;color:#334155;white-space:pre-line">${text}</p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
    <p style="margin:0;font-size:12px;color:#64748b">Vertex Placement Intelligence</p>
  </div>`

  if (!transporter) {
    logger.info(`[Email] (SMTP not configured) To: ${to} | ${subject}`)
    logger.info(`[Email] ${text}`)
    return { sent: true, mode: 'logged' }
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: `[Vertex] ${subject}`,
      text,
      html: bodyHtml,
    })
    logger.info(`[Email] Sent to ${to}: ${subject}`)
    return { sent: true, mode: 'smtp' }
  } catch (err) {
    logger.error('[Email] Send failed:', err)
    return { sent: false, mode: 'smtp' }
  }
}

export function isEmailConfigured() {
  return configured
}
