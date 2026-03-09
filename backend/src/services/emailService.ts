/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import sgMail from '@sendgrid/mail';
import logger from '../config/logger';
import { getEnv } from '../config/env';

/**
 * Data required for FCRA adverse action notices.
 *
 * Reference: 15 U.S.C. Section 1681 et seq. (Fair Credit Reporting Act)
 * Both pre-adverse and final adverse action notices must include the
 * consumer reporting agency information and the consumer's rights.
 */
export interface FCRAAdverseActionData {
  firstName: string;
  reportAgency: string;
  reportAgencyPhone: string;
  reportAgencyAddress: string;
  adverseReason?: string;
}

interface EmailServiceConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Email Service using SendGrid
 *
 * Handles all transactional email delivery for CoNest.
 * All sends are fire-and-forget: errors are logged but never thrown,
 * so callers are not blocked by email delivery failures.
 *
 * Reference: https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */
export class EmailService {
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(config: EmailServiceConfig) {
    sgMail.setApiKey(config.apiKey);
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  /**
   * HTML entity escape helper to prevent XSS in email templates.
   * Escapes &, <, >, ", and ' characters.
   */
  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Internal send helper. Wraps sgMail.send with error handling.
   * Logs failures but does NOT throw -- email is fire-and-forget.
   */
  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: { email: this.fromEmail, name: this.fromName },
        subject,
        html,
      });
      logger.info('Email sent successfully', { to, subject });
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Common email wrapper with CoNest branding.
   */
  private wrapHtml(body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background-color:#2D6A4F;padding:24px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;">CoNest</h1>
</td></tr>
<tr><td style="padding:32px 24px;">${body}</td></tr>
<tr><td style="background-color:#f9f9f9;padding:16px 24px;text-align:center;color:#888;font-size:12px;">
<p style="margin:0;">&copy; ${new Date().getFullYear()} CoNest. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  /**
   * Send a welcome email to a newly registered parent.
   */
  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const html = this.wrapHtml(`
<h2 style="color:#2D6A4F;margin-top:0;">Welcome to CoNest, ${this.esc(firstName)}!</h2>
<p style="color:#333;line-height:1.6;">
  We're glad you've joined our community of single parents finding safe,
  affordable shared housing.
</p>
<p style="color:#333;line-height:1.6;">
  To get started, complete your profile and verification process so you
  can begin connecting with compatible roommates.
</p>
<a href="https://conest.app/onboarding" style="display:inline-block;background-color:#2D6A4F;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:16px;font-weight:bold;">
  Get Started
</a>
`);
    await this.send(to, 'Welcome to CoNest!', html);
  }

  /**
   * Send an email verification link.
   * Link format: https://conest.app/verify-email/{token}
   */
  async sendEmailVerification(to: string, token: string): Promise<void> {
    const verifyUrl = `https://conest.app/verify-email/${token}`;
    const html = this.wrapHtml(`
<h2 style="color:#2D6A4F;margin-top:0;">Verify Your Email</h2>
<p style="color:#333;line-height:1.6;">
  Please verify your email address by clicking the button below.
  This link will expire in 24 hours.
</p>
<a href="${this.esc(verifyUrl)}" style="display:inline-block;background-color:#2D6A4F;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:16px;font-weight:bold;">
  Verify Email
</a>
<p style="color:#888;font-size:13px;margin-top:24px;">
  If the button doesn't work, copy and paste this link into your browser:<br/>
  <a href="${this.esc(verifyUrl)}" style="color:#2D6A4F;">${this.esc(verifyUrl)}</a>
</p>
`);
    await this.send(to, 'Verify Your Email - CoNest', html);
  }

  /**
   * Confirm that a user's account has been deleted.
   */
  async sendAccountDeletionConfirmation(to: string): Promise<void> {
    const html = this.wrapHtml(`
<h2 style="color:#2D6A4F;margin-top:0;">Account Deleted</h2>
<p style="color:#333;line-height:1.6;">
  Your CoNest account has been successfully deleted. All of your personal
  data has been removed from our systems in accordance with our privacy policy.
</p>
<p style="color:#333;line-height:1.6;">
  If you did not request this deletion, please contact our support team
  immediately at <a href="mailto:support@conest.app" style="color:#2D6A4F;">support@conest.app</a>.
</p>
<p style="color:#888;font-size:13px;margin-top:24px;">
  We're sorry to see you go. You're always welcome to rejoin CoNest in the future.
</p>
`);
    await this.send(to, 'Your CoNest Account Has Been Deleted', html);
  }

  /**
   * Send FCRA pre-adverse action notice.
   *
   * Required by FCRA Section 604(b)(3) and Section 615(a):
   * - Inform the consumer that adverse action MAY be taken
   * - Identify the consumer reporting agency
   * - State that the agency did not make the decision
   * - Inform of the right to dispute and obtain a free copy
   * - Provide a reasonable period (5 business days) to respond
   *
   * Reference: 15 U.S.C. Section 1681b(b)(3), 15 U.S.C. Section 1681m(a)
   */
  async sendFCRAPreAdverseNotice(to: string, data: FCRAAdverseActionData): Promise<void> {
    const html = this.wrapHtml(`
<h2 style="color:#2D6A4F;margin-top:0;">Pre-Adverse Action Notice</h2>
<p style="color:#333;line-height:1.6;">
  Dear ${this.esc(data.firstName)},
</p>
<p style="color:#333;line-height:1.6;">
  We are writing to inform you that, based on information contained in a
  consumer report, we may take adverse action regarding your CoNest account.
  ${data.adverseReason ? `The reason for this potential action is: ${this.esc(data.adverseReason)}.` : ''}
</p>
<p style="color:#333;line-height:1.6;font-weight:bold;">
  You have 5 business days from receipt of this notice to dispute the accuracy
  or completeness of the information in the report before any final decision is made.
</p>
<h3 style="color:#2D6A4F;">Your Rights Under the Fair Credit Reporting Act (FCRA)</h3>
<ul style="color:#333;line-height:1.8;">
  <li>You have the right to dispute the accuracy or completeness of any information
  in the consumer report.</li>
  <li>You have the right to obtain a free copy of the consumer report from the
  reporting agency within 60 days.</li>
  <li>The consumer reporting agency did not make the decision to take this
  potential adverse action and is unable to provide you with specific reasons for it.</li>
</ul>
<h3 style="color:#2D6A4F;">Consumer Reporting Agency</h3>
<p style="color:#333;line-height:1.6;">
  The report was obtained from:<br/>
  <strong>${this.esc(data.reportAgency)}</strong><br/>
  ${this.esc(data.reportAgencyAddress)}<br/>
  Phone: ${this.esc(data.reportAgencyPhone)}
</p>
<p style="color:#333;line-height:1.6;">
  To dispute information in your report, contact the agency above directly.
</p>
`);
    await this.send(to, 'Pre-Adverse Action Notice - CoNest', html);
  }

  /**
   * Send FCRA final adverse action notice.
   *
   * Required by FCRA Section 615(a):
   * - Inform the consumer that adverse action HAS been taken
   * - Identify the consumer reporting agency
   * - State that the agency did not make the decision
   * - Inform of the right to dispute and reinvestigation
   * - Inform of the right to a free copy within 60 days
   *
   * Reference: 15 U.S.C. Section 1681m(a)
   */
  async sendFCRAFinalAdverseNotice(to: string, data: FCRAAdverseActionData): Promise<void> {
    const html = this.wrapHtml(`
<h2 style="color:#2D6A4F;margin-top:0;">Adverse Action Notice</h2>
<p style="color:#333;line-height:1.6;">
  Dear ${this.esc(data.firstName)},
</p>
<p style="color:#333;line-height:1.6;">
  We are writing to inform you that, based in whole or in part on information
  contained in a consumer report, we have taken adverse action regarding
  your CoNest account.
  ${data.adverseReason ? `The reason for this action is: ${this.esc(data.adverseReason)}.` : ''}
</p>
<h3 style="color:#2D6A4F;">Your Rights Under the Fair Credit Reporting Act (FCRA)</h3>
<ul style="color:#333;line-height:1.8;">
  <li>You have the right to request a reinvestigation of the information
  in the consumer report that was the basis of this decision.</li>
  <li>You have the right to obtain a free copy of the consumer report from
  the reporting agency within 60 days of this notice.</li>
  <li>You have the right to dispute the accuracy or completeness of any
  information in the consumer report directly with the reporting agency.</li>
  <li>The consumer reporting agency did not make the decision to take this
  adverse action and is unable to provide you with specific reasons for it.</li>
</ul>
<h3 style="color:#2D6A4F;">Consumer Reporting Agency</h3>
<p style="color:#333;line-height:1.6;">
  The report was obtained from:<br/>
  <strong>${this.esc(data.reportAgency)}</strong><br/>
  ${this.esc(data.reportAgencyAddress)}<br/>
  Phone: ${this.esc(data.reportAgencyPhone)}
</p>
<p style="color:#333;line-height:1.6;">
  To dispute information or request a reinvestigation, contact the agency above directly.
</p>
`);
    await this.send(to, 'Adverse Action Notice - CoNest', html);
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

/**
 * Get or create the singleton EmailService instance.
 * Uses environment variables via getEnv() for configuration.
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    const env = getEnv();
    emailServiceInstance = new EmailService({
      apiKey: env.SENDGRID_API_KEY,
      fromEmail: env.SENDGRID_FROM_EMAIL,
      fromName: env.SENDGRID_FROM_NAME,
    });
  }
  return emailServiceInstance;
}
