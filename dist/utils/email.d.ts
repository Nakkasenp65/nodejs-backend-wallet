/**
 * Send an email via Gmail SMTP.
 * Notes:
 * - Use a Gmail account with 2FA + an App Password.
 * - FROM must match the authenticated Gmail address or Gmail will rewrite it.
 */
export default function sendEmail({ to, subject, text, html, attachments, }: {
    to: any;
    subject: any;
    text: any;
    html: any;
    attachments: any;
}): Promise<any>;
//# sourceMappingURL=email.d.ts.map