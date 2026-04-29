import { useState } from 'react';
import { toast } from '@/stores/toastStore';

export interface NotifyBackInStockProps {
  productId: string;
}

type Status = 'idle' | 'submitting' | 'success';

export default function NotifyBackInStock({ productId }: NotifyBackInStockProps) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/notify-stock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, productId, website }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setStatus('success');
      toast.success('Vous serez prévenu·e dès le retour en stock');
    } catch (err) {
      setStatus('idle');
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-card border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
        Inscrit·e&nbsp;! On vous écrit dès qu'il est de nouveau disponible.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-card bg-bg-soft p-4">
      <p className="text-sm font-medium text-primary">Prévenez-moi quand de retour en stock</p>
      <p className="mt-1 text-xs text-primary/60">
        On vous envoie un email dès qu'il est à nouveau disponible. Pas de spam.
      </p>

      {/* Honeypot anti-spam (off-screen, bots fill it) */}
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
        <label htmlFor="notify-website">Site web (laisser vide)</label>
        <input
          id="notify-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="notify-email" className="sr-only">
          Votre email
        </label>
        <input
          id="notify-email"
          type="email"
          required
          autoComplete="email"
          placeholder="votre@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 flex-1 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          disabled={status !== 'idle'}
        />
        <button
          type="submit"
          disabled={status !== 'idle' || email.trim().length === 0}
          className="inline-flex h-11 items-center justify-center rounded-btn bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-progress disabled:opacity-60"
        >
          {status === 'submitting' ? 'Envoi…' : 'Me prévenir'}
        </button>
      </div>
    </form>
  );
}
