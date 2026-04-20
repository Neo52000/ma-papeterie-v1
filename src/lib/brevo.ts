// Minimal Brevo wrapper — V1 only needs transactional sends (B2B quote confirmation, contact).
// Newsletter & marketing flows ship in Phase 2.

const BREVO_API = 'https://api.brevo.com/v3';

export interface BrevoContact {
  email: string;
  name?: string;
}

export interface BrevoTransactionalEmail {
  to: BrevoContact[];
  sender: BrevoContact;
  subject: string;
  htmlContent: string;
  replyTo?: BrevoContact;
  templateId?: number;
  params?: Record<string, string | number>;
}

export async function sendTransactionalEmail(payload: BrevoTransactionalEmail): Promise<{ messageId: string }> {
  const apiKey = import.meta.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('Missing BREVO_API_KEY env var.');
  }

  const response = await fetch(`${BREVO_API}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo ${response.status}: ${body}`);
  }

  return (await response.json()) as { messageId: string };
}
