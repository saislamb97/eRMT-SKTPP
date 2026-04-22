import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      console.error("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    if (!process.env.BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    console.log("Sending email to:", to);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "e-RMT",
          email: process.env.EMAIL_FROM
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Brevo API error:", result);
      return NextResponse.json(
        { error: result.message || "Failed to send email" },
        { status: response.status }
      );
    }

    console.log("✅ Email sent successfully:", result.messageId);
    return NextResponse.json({ 
      success: true,
      messageId: result.messageId 
    });

  } catch (error) {
    console.error("❌ Email error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}