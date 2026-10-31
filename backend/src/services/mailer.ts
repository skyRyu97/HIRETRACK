export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_resend_api_key_here') {
    // Development / fallback mode: log formatted email preview to console
    console.log('\n[Mailer: Simulated Delivery]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (HTML length): ${html.length} characters`);
    console.log('----------------------------------------------------\n');
    return { success: true, id: 'simulated_' + Date.now() };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'HireTrack AI <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn(`[Mailer] Resend API error (${response.status}): ${errBody}`);
      return { success: false };
    }

    const data: any = await response.json();
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[Mailer] Delivery exception:', err);
    return { success: false };
  }
}
