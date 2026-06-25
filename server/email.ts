import nodemailer from 'nodemailer';

// Zoho India SMTP configuration
const ZOHO_EMAIL = process.env.ZOHO_EMAIL || 'jeevan@pharmaoasis.com';
const ZOHO_PASSWORD = process.env.ZOHO_EMAIL_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'jeevan@pharmaoasis.com';

// Create transporter for Zoho India
const transporter = ZOHO_PASSWORD ? nodemailer.createTransport({
  host: 'smtp.zoho.in', // Zoho India
  port: 465,
  secure: true, // SSL
  auth: {
    user: ZOHO_EMAIL,
    pass: ZOHO_PASSWORD,
  },
}) : null;

interface EmailResult {
  success: boolean;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!transporter) {
    console.log(`[EMAIL - DEV MODE] Zoho password not configured`);
    console.log(`[EMAIL - DEV MODE] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL - DEV MODE] Body preview: ${html.substring(0, 200)}...`);
    return { success: true };
  }

  try {
    await transporter.sendMail({
      from: `Pharma Oasis <${ZOHO_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[EMAIL ERROR] Failed to send to ${to}:`, error?.message || error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

export async function sendCustomerRegistrationNotification(data: {
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
}): Promise<EmailResult> {
  const subject = `New Customer Registration: ${data.companyName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">New Customer Registration</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <h2 style="color: #1e40af; margin-top: 0;">Registration Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 140px;">Company Name:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Contact Name:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.contactName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
            <td style="padding: 8px 0;">${data.phone}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
          <p style="margin: 0; color: #92400e;">
            <strong>Action Required:</strong> Please review this registration in the admin panel and approve or reject the account.
          </p>
        </div>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        This is an automated notification from Pharma Oasis B2B Platform
      </div>
    </div>
  `;

  return sendEmail(NOTIFICATION_EMAIL, subject, html);
}

export async function sendSupplierRegistrationNotification(data: {
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  productCategories?: string;
}): Promise<EmailResult> {
  const subject = `New Supplier Application: ${data.companyName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #059669; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">New Supplier Application</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <h2 style="color: #059669; margin-top: 0;">Application Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 140px;">Company Name:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Contact Name:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.contactName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Phone:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.phone}</td>
          </tr>
          ${data.productCategories ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Product Categories:</td>
            <td style="padding: 8px 0;">${data.productCategories}</td>
          </tr>
          ` : ''}
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #d1fae5; border-radius: 8px;">
          <p style="margin: 0; color: #065f46;">
            <strong>New Supplier Lead:</strong> Review this application in the admin panel to assess partnership opportunities.
          </p>
        </div>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        This is an automated notification from Pharma Oasis B2B Platform
      </div>
    </div>
  `;

  return sendEmail(NOTIFICATION_EMAIL, subject, html);
}

export async function sendContactFormNotification(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
}): Promise<EmailResult> {
  const emailSubject = `Contact Form: ${data.subject}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #6366f1; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">New Contact Message</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <h2 style="color: #6366f1; margin-top: 0;">Message Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 100px;">From:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.email}</td>
          </tr>
          ${data.phone ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Phone:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.phone}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Subject:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.subject}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 8px;">
          <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
        </div>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Reply directly to ${data.email} to respond to this message
      </div>
    </div>
  `;

  return sendEmail(NOTIFICATION_EMAIL, emailSubject, html);
}

export async function sendQuoteSubmissionNotification(data: {
  quoteId: number;
  customerEmail: string;
  customerName: string;
  companyName: string;
  itemCount: number;
  totalValue: string;
}): Promise<EmailResult> {
  const subject = `New Quote Request #${data.quoteId} from ${data.companyName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #7c3aed; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">New Quote Request</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Quote #${data.quoteId}</p>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <h2 style="color: #7c3aed; margin-top: 0;">Quote Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 140px;">Quote ID:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">#${data.quoteId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Company:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Contact:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.customerEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Items:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.itemCount} product(s)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Estimated Total:</td>
            <td style="padding: 8px 0; font-size: 18px; color: #7c3aed;">${data.totalValue}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #ede9fe; border-radius: 8px;">
          <p style="margin: 0; color: #5b21b6;">
            <strong>Action Required:</strong> Review this quote in the admin panel and provide a response to the customer.
          </p>
        </div>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        This is an automated notification from Pharma Oasis B2B Platform
      </div>
    </div>
  `;

  return sendEmail(NOTIFICATION_EMAIL, subject, html);
}

export async function sendAccountApprovalEmail(data: {
  email: string;
  contactName: string;
  companyName: string;
}): Promise<EmailResult> {
  const subject = `Your Pharma Oasis Account Has Been Approved`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #059669; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Account Approved!</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.contactName},</p>
        <p>Great news! Your Pharma Oasis wholesale account for <strong>${data.companyName}</strong> has been approved.</p>
        <p>You can now:</p>
        <ul style="color: #374151;">
          <li>Browse our full product catalogue with wholesale pricing</li>
          <li>Request quotes for bulk orders</li>
          <li>Access exclusive B2B features</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://pharmaoasis.com/login" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Login to Your Account
          </a>
        </div>
        <p style="color: #6b7280;">If you have any questions, please don't hesitate to contact our team.</p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis - Your Trusted Wholesale Partner
      </div>
    </div>
  `;

  return sendEmail(data.email, subject, html);
}

export async function sendAccountRejectionEmail(data: {
  email: string;
  contactName: string;
  companyName: string;
  reason?: string;
}): Promise<EmailResult> {
  const subject = `Update on Your Pharma Oasis Account Application`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Application Update</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.contactName},</p>
        <p>Thank you for your interest in becoming a Pharma Oasis wholesale partner.</p>
        <p>After reviewing your application for <strong>${data.companyName}</strong>, we regret to inform you that we are unable to approve your account at this time.</p>
        ${data.reason ? `
        <div style="padding: 15px; background: #fef2f2; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${data.reason}</p>
        </div>
        ` : ''}
        <p>If you believe this decision was made in error or would like to provide additional documentation, please contact our team at trade@pharmaoasis.com.</p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis - Your Trusted Wholesale Partner
      </div>
    </div>
  `;

  return sendEmail(data.email, subject, html);
}

export async function sendRegistrationConfirmationToUser(data: {
  email: string;
  contactName: string;
  companyName: string;
}): Promise<EmailResult> {
  const subject = `Welcome to Pharma Oasis - Registration Received`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Registration Received</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.contactName},</p>
        <p>Thank you for registering with Pharma Oasis! We have received your wholesale account application for <strong>${data.companyName}</strong>.</p>
        <div style="padding: 15px; background: #fef3c7; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>What happens next?</strong></p>
          <p style="margin: 10px 0 0 0; color: #92400e;">Our team will review your application and verify your business credentials. This typically takes 1-2 business days.</p>
        </div>
        <p>Once approved, you'll receive an email confirmation and will be able to:</p>
        <ul style="color: #374151;">
          <li>Access wholesale pricing on all products</li>
          <li>Request quotes for bulk orders</li>
          <li>Manage your account and orders</li>
        </ul>
        <p style="color: #6b7280;">If you have any questions, please contact us at trade@pharmaoasis.com</p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis - Your Trusted Wholesale Partner
      </div>
    </div>
  `;

  return sendEmail(data.email, subject, html);
}

export async function sendQuoteConfirmationToCustomer(data: {
  email: string;
  contactName: string;
  quoteId: number;
  itemCount: number;
  totalValue: string;
}): Promise<EmailResult> {
  const subject = `Quote Request Received - #${data.quoteId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Quote Request Received</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Reference: #${data.quoteId}</p>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.contactName},</p>
        <p>Thank you for your quote request. We have received your submission and our team will review it shortly.</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Quote Summary</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 5px 0;">Quote Reference:</td>
              <td style="text-align: right; font-weight: bold;">#${data.quoteId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">Number of Items:</td>
              <td style="text-align: right;">${data.itemCount} product(s)</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">Estimated Total:</td>
              <td style="text-align: right; font-weight: bold; color: #1e40af;">${data.totalValue}</td>
            </tr>
          </table>
        </div>
        <p><strong>What happens next?</strong></p>
        <ol style="color: #374151;">
          <li>Our team will review your quote request</li>
          <li>We'll confirm product availability and pricing</li>
          <li>You'll receive a formal quote within 1-2 business days</li>
        </ol>
        <p style="color: #6b7280;">You can track the status of your quote by logging into your account.</p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis - Your Trusted Wholesale Partner
      </div>
    </div>
  `;

  return sendEmail(data.email, subject, html);
}

export async function sendContactFormConfirmation(data: {
  email: string;
  name: string;
  subject: string;
}): Promise<EmailResult> {
  const emailSubject = `We've Received Your Message - Pharma Oasis`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Message Received</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.name},</p>
        <p>Thank you for contacting Pharma Oasis. We have received your enquiry regarding:</p>
        <div style="padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">${data.subject}</p>
        </div>
        <p>Our team will review your message and get back to you within <strong>48 business hours</strong>.</p>
        <p style="color: #6b7280;">For urgent enquiries, please call us at +44 (0)20 1234 5678.</p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis - Your Trusted Wholesale Partner
      </div>
    </div>
  `;

  return sendEmail(data.email, emailSubject, html);
}

export async function sendSupplierConfirmation(data: {
  email: string;
  contactName: string;
  companyName: string;
}): Promise<EmailResult> {
  const subject = `Supplier Application Received - Pharma Oasis`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #059669; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Application Received</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.contactName},</p>
        <p>Thank you for your interest in becoming a supplier partner with Pharma Oasis.</p>
        <p>We have received your application for <strong>${data.companyName}</strong> and our procurement team will review it carefully.</p>
        <div style="padding: 15px; background: #d1fae5; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #065f46;"><strong>What happens next?</strong></p>
          <p style="margin: 10px 0 0 0; color: #065f46;">Our team will contact you within 5 business days to discuss potential partnership opportunities.</p>
        </div>
        <p style="color: #6b7280;">If you have any questions, please contact us at trade@pharmaoasis.com</p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis - Your Trusted Wholesale Partner
      </div>
    </div>
  `;

  return sendEmail(data.email, subject, html);
}

export async function sendPasswordResetEmail(data: {
  email: string;
  contactName: string;
  resetUrl: string;
}): Promise<EmailResult> {
  const subject = `Reset Your Pharma Oasis Password`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Password Reset Request</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.contactName || "Customer"},</p>
        <p>We received a request to reset the password for your Pharma Oasis account associated with <strong>${data.email}</strong>.</p>
        <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}"
             style="display: inline-block; background: #1e40af; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Reset My Password
          </a>
        </div>
        <div style="padding: 15px; background: #fef3c7; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            <strong>Security notice:</strong> If you did not request a password reset, please ignore this email. Your password will not change unless you click the link above.
          </p>
        </div>
        <p style="font-size: 13px; color: #6b7280;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${data.resetUrl}" style="color: #1e40af; word-break: break-all;">${data.resetUrl}</a>
        </p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis &mdash; Your Trusted Wholesale Partner
      </div>
    </div>
  `;
  return sendEmail(data.email, subject, html);
}

export async function sendInviteEmail(data: {
  email: string;
  contactName: string;
  roleLabel: string; // "Administrator" | "Staff member"
  inviteUrl: string;
}): Promise<EmailResult> {
  const subject = `You've been invited to the Pharma Oasis admin`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #047857; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Welcome to the team</h1>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Hello ${data.contactName || "there"},</p>
        <p>You've been invited to the Pharma Oasis admin as a <strong>${data.roleLabel}</strong> (account: <strong>${data.email}</strong>).</p>
        <p>Click below to set your password and activate your account. This invite is valid for <strong>7 days</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.inviteUrl}"
             style="display: inline-block; background: #047857; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Set My Password
          </a>
        </div>
        <p style="font-size: 13px; color: #6b7280;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${data.inviteUrl}" style="color: #047857; word-break: break-all;">${data.inviteUrl}</a>
        </p>
        <div style="padding: 15px; background: #fef3c7; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            <strong>Didn't expect this?</strong> If you weren't expecting an invite, you can safely ignore this email.
          </p>
        </div>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis &mdash; Your Trusted Wholesale Partner
      </div>
    </div>
  `;
  return sendEmail(data.email, subject, html);
}

export async function sendChatLeadNotification(data: {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  interest?: string;
  sessionId: string;
  visitorIp?: string;
}): Promise<EmailResult> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    return { success: false, error: "No notification email configured" };
  }

  const subject = `New Chat Lead Captured - Pharma Oasis`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #7c3aed; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">New Chat Lead</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">AI Chatbot Lead Capture</p>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">A visitor has provided their contact details via the AI chatbot.</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #7c3aed;">Lead Details</h3>
          <table style="width: 100%;">
            ${data.name ? `<tr><td style="padding: 8px 0; font-weight: bold;">Name:</td><td>${data.name}</td></tr>` : ''}
            ${data.company ? `<tr><td style="padding: 8px 0; font-weight: bold;">Company:</td><td>${data.company}</td></tr>` : ''}
            ${data.email ? `<tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td><a href="mailto:${data.email}">${data.email}</a></td></tr>` : ''}
            ${data.phone ? `<tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td><a href="tel:${data.phone}">${data.phone}</a></td></tr>` : ''}
            ${data.interest ? `<tr><td style="padding: 8px 0; font-weight: bold;">Interest:</td><td>${data.interest}</td></tr>` : ''}
            <tr><td style="padding: 8px 0; font-weight: bold;">Session ID:</td><td style="font-size: 12px; color: #666;">${data.sessionId}</td></tr>
            ${data.visitorIp ? `<tr><td style="padding: 8px 0; font-weight: bold;">Visitor IP:</td><td style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.visitorIp}</td></tr>` : ''}
          </table>
        </div>
        <p><strong>Recommended Action:</strong></p>
        <ul style="color: #374151;">
          <li>Contact this lead within 24 hours</li>
          <li>Review the chat history in the admin panel</li>
          <li>Follow up on their specific interests</li>
          ${data.visitorIp ? `<li>IP address recorded for security — report abuse to your hosting provider if needed</li>` : ''}
        </ul>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        Pharma Oasis - Your Trusted Wholesale Partner
      </div>
    </div>
  `;

  return sendEmail(notificationEmail, subject, html);
}

// ============================================================
// Customer Portal — order & response emails
// ============================================================
export async function sendOrderSubmissionNotification(data: {
  orderId: number;
  customerEmail: string;
  customerName: string;
  companyName: string;
  itemCount: number;
  totalValue: string;
}): Promise<EmailResult> {
  const subject = `New Order #${data.orderId} from ${data.companyName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f766e; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">New Order Placed</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Order #${data.orderId}</p>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 140px;">Order ID:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">#${data.orderId}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Company:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.companyName}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Contact:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.customerName}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.customerEmail}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Items:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${data.itemCount} product(s)</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Order Total:</td><td style="padding: 8px 0; font-size: 18px; color: #0f766e;">${data.totalValue}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #ccfbf1; border-radius: 8px;">
          <p style="margin: 0; color: #115e59;"><strong>Action Required:</strong> Review and confirm this order in the admin panel.</p>
        </div>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">Automated notification from Pharma Oasis B2B Platform</div>
    </div>
  `;
  return sendEmail(NOTIFICATION_EMAIL, subject, html);
}

export async function sendOrderConfirmationToCustomer(data: {
  email: string;
  contactName: string;
  orderId: number;
  itemCount: number;
  totalValue: string;
}): Promise<EmailResult> {
  const subject = `We've received your order #${data.orderId} - Pharma Oasis`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f766e; color: white; padding: 20px; text-align: center;"><h1 style="margin: 0;">Order Received</h1></div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.contactName},</p>
        <p>Thank you — we've received your order <strong>#${data.orderId}</strong> (${data.itemCount} product(s), total ${data.totalValue}).</p>
        <p>Our team will confirm pricing, stock and delivery shortly. You can track it in your portal.</p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">Pharma Oasis - Your Trusted Wholesale Partner</div>
    </div>
  `;
  return sendEmail(data.email, subject, html);
}

export async function sendCustomerResponseEmail(data: {
  email: string;
  contactName: string;
  kind: "order" | "quote";
  refId: number;
  status: string;
  message: string;
}): Promise<EmailResult> {
  const label = data.kind === "order" ? "Order" : "Quote";
  const subject = `Update on your ${label.toLowerCase()} #${data.refId} - Pharma Oasis`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #7c3aed; color: white; padding: 20px; text-align: center;"><h1 style="margin: 0;">${label} Update</h1><p style="margin: 5px 0 0 0; opacity: 0.9;">${label} #${data.refId}</p></div>
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px;">Dear ${data.contactName},</p>
        <p>There's an update on your ${label.toLowerCase()} <strong>#${data.refId}</strong> — status: <strong>${data.status}</strong>.</p>
        ${data.message ? `<div style="padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0;"><p style="margin: 0; white-space: pre-wrap;">${data.message}</p></div>` : ""}
        <p style="color: #6b7280;">You can view full details in your customer portal.</p>
      </div>
      <div style="padding: 15px; background: #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">Pharma Oasis - Your Trusted Wholesale Partner</div>
    </div>
  `;
  return sendEmail(data.email, subject, html);
}
