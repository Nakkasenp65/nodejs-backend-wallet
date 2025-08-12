// src/utils/email.js
import nodemailer from 'nodemailer';

/**
 * Send an email via Gmail SMTP.
 * Notes:
 * - Use a Gmail account with 2FA + an App Password.
 * - FROM must match the authenticated Gmail address or Gmail will rewrite it.
 */
export default async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments, // [{ filename, content|path|buffer, contentType }]
}) {
  if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error('EMAIL_USERNAME / EMAIL_APP_PASSWORD not set');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // or 587 with secure: false
    secure: true, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USERNAME, // your Gmail address
      pass: process.env.EMAIL_APP_PASSWORD, // Gmail App Password
    },
  });

  // Optional quick connectivity check (comment out if you prefer less latency)
  // await transporter.verify();

  const info = await transporter.sendMail({
    from: `"Aom-Down App" <${process.env.EMAIL_USERNAME}>`, // must match Gmail account
    replyTo: 'no-reply@oknumberone.com', // your branded address (no domain ownership needed for replyTo)
    to,
    subject,
    text: text ?? '',
    html: html ?? undefined,
    attachments: attachments ?? undefined,
  });

  return info; // contains messageId, accepted/rejected arrays, etc.
}
