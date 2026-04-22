// app/api/send-verification-email/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminAuth } from "../../../lib/firebase-admin";

export const runtime = "nodejs";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildVerificationEmail({ name, verifyUrl }) {
  const safeName = escapeHtml(name || "there");

  return {
    subject: "Verify your email for e-RMT",
    text: `Hello ${name || "there"},

You’re receiving this email because an e-RMT account was created using this email address.

Please verify your email by opening the link below:
${verifyUrl}

If you did not request this, you can ignore this email.

e-RMT
Sent from ${process.env.GMAIL_USER}
`,
    html: `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#111827;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:24px 12px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:32px;">
                  <tr>
                    <td>
                      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">
                        Verify your email for e-RMT
                      </h1>

                      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                        Hello ${safeName},
                      </p>

                      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                        You’re receiving this email because an e-RMT account was created using this email address.
                      </p>

                      <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                        Please confirm your email by clicking the button below.
                      </p>

                      <p style="margin:0 0 28px;">
                        <a
                          href="${verifyUrl}"
                          style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:16px;font-weight:600;"
                        >
                          Verify email
                        </a>
                      </p>

                      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#6b7280;">
                        If you did not request this, you can safely ignore this message.
                      </p>

                      <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#6b7280;">
                        If the button doesn’t work, copy and paste this link into your browser:
                      </p>

                      <p style="margin:0 0 24px;font-size:13px;line-height:1.7;word-break:break-all;">
                        <a href="${verifyUrl}" style="color:#2563eb;">${verifyUrl}</a>
                      </p>

                      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

                      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                        e-RMT
                      </p>
                      <p style="margin:0;font-size:13px;color:#6b7280;">
                        Sent from ${escapeHtml(process.env.GMAIL_USER || "")}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };
}

export async function POST(request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Missing required field: email" },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      );
    }

    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/login?verified=1`,
      handleCodeInApp: false,
    };

    const verifyUrl = await adminAuth.generateEmailVerificationLink(
      email,
      actionCodeSettings
    );

    const emailContent = buildVerificationEmail({
      name,
      verifyUrl,
    });

    const info = await transporter.sendMail({
      from: `"e-RMT" <${process.env.GMAIL_USER}>`,
      replyTo: process.env.GMAIL_USER,
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Verification email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send verification email" },
      { status: 500 }
    );
  }
}