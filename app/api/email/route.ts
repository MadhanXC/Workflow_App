import { NextResponse } from 'next/server';
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error('RESEND_FROM_EMAIL environment variable is not set');
}

const resend = new Resend(process.env.RESEND_API_KEY);

// CORS headers for API route
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: Request) {
  try {
    const { to, subject, attachments } = await request.json();

    // Validate required fields
    if (!to || !subject || !attachments) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Sending email:', {
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject,
      attachmentsCount: attachments.length
    });

    // Send email using Resend
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Task Report</h2>
          <p>Please find attached the requested task report.</p>
          <p>This report was generated for ${to}.</p>
          <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
      attachments: attachments.map(attachment => ({
        filename: attachment.filename,
        content: Buffer.from(new Uint8Array(attachment.content))
      }))
    });

    console.log('Email sent successfully:', data);

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}