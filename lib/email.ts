export async function sendReportEmail(
  to: string,
  subject: string,
  attachments: { filename: string; content: Buffer }[]
) {
  try {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        attachments: attachments.map(attachment => ({
          filename: attachment.filename,
          content: Array.from(attachment.content)
        }))
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to send email';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        console.error('Raw error response:', errorText);
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error instanceof Error ? error : new Error('Failed to send email');
  }
}