// ===========================================================
// EMAIL SERVICE - Send Job Applications
// ===========================================================
// Uses Resend for email delivery

interface EmailAttachment {
  filename: string
  content: string | Buffer
  contentType?: string
}

interface SendEmailInput {
  to: string
  subject: string
  body: string
  html?: string
  attachments?: EmailAttachment[]
  replyTo?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

class EmailService {
  private apiKey: string | null = null
  private fromEmail: string = 'noreply@jobpilot.app'
  private fromName: string = 'Job Pilot'

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || null
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@jobpilot.app'
    this.fromName = process.env.EMAIL_FROM_NAME || 'Job Pilot'
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Send an email using Resend API
   */
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Email service not configured. Add RESEND_API_KEY to environment.' }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [input.to],
          subject: input.subject,
          text: input.body,
          html: input.html || this.textToHtml(input.body),
          reply_to: input.replyTo,
          attachments: input.attachments?.map(att => ({
            filename: att.filename,
            content: typeof att.content === 'string' 
              ? att.content 
              : att.content.toString('base64'),
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || `Email send failed: ${response.status}` 
        }
      }

      return { 
        success: true, 
        messageId: data.id 
      }
    } catch (err) {
      console.error('Email send error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to send email' 
      }
    }
  }

  /**
   * Send a job application email
   */
  async sendJobApplication(params: {
    recipientEmail: string
    recipientName?: string
    applicantName: string
    applicantEmail: string
    jobTitle: string
    company: string
    subject: string
    coverLetter: string
    resumeUrl?: string
  }): Promise<SendEmailResult> {
    const greeting = params.recipientName 
      ? `Dear ${params.recipientName},` 
      : 'Dear Hiring Manager,'

    const body = `${greeting}

${params.coverLetter}

Best regards,
${params.applicantName}
${params.applicantEmail}`

    const html = this.formatApplicationEmail({
      greeting,
      coverLetter: params.coverLetter,
      applicantName: params.applicantName,
      applicantEmail: params.applicantEmail,
      jobTitle: params.jobTitle,
      company: params.company,
    })

    return this.sendEmail({
      to: params.recipientEmail,
      subject: params.subject,
      body,
      html,
      replyTo: params.applicantEmail,
    })
  }

  /**
   * Convert plain text to simple HTML
   */
  private textToHtml(text: string): string {
    return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      ${text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}
    </div>`
  }

  /**
   * Format a professional job application email
   */
  private formatApplicationEmail(params: {
    greeting: string
    coverLetter: string
    applicantName: string
    applicantEmail: string
    jobTitle: string
    company: string
  }): string {
    const paragraphs = params.coverLetter
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333;">
        <p style="margin: 0 0 16px 0;">${params.greeting}</p>
        
        ${paragraphs}
        
        <p style="margin: 24px 0 8px 0;">Best regards,</p>
        <p style="margin: 0; font-weight: 600;">${params.applicantName}</p>
        <p style="margin: 4px 0 0 0; color: #666;">
          <a href="mailto:${params.applicantEmail}" style="color: #2563eb; text-decoration: none;">${params.applicantEmail}</a>
        </p>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #999;">
      <p>Application for ${params.jobTitle} at ${params.company}</p>
    </div>
  </div>
</body>
</html>`
  }
}

export const emailService = new EmailService()
