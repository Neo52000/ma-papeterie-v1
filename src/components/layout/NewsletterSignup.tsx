import { useState } from 'react';
import { toast } from '@/stores/toastStore';

type Status = 'idle' | 'submitting' | 'success';

export interface NewsletterSignupProps {
  source?: string;
}

export default function NewsletterSignup({ source = 'footer' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source, website }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setStatus('success');
      toast.success('Inscription enregistrée — merci !');
    } catch (err) {
      setStatus('idle');
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (status === 'success') {
    return (
      <p className="text-xs text-primary/60">
        ✓ Inscription enregistrée. Surveillez votre boîte mail.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      {/* Honeypot anti-spam */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label htmlFor="nl-website">Site web (laisser vide)</label>
        <input
          id="nl-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <label htmlFor="newsletter-email" className="sr-only">
        Votre email
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        autoComplete="email"
        placeholder="votre@email.fr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status !== 'idle'}
        className="h-10 flex-1 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <button
        type="submit"
        disabled={status !== 'idle' || email.trim().length === 0}
        className="inline-flex h-10 items-center justify-center rounded-btn bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-progress disabled:opacity-60"
      >
        {status === 'submitting' ? 'Envoi…' : "S'inscrire"}
      </button>
    </form>
  );
}
