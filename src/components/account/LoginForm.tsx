import { useState, type FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError) {
      setError(translateAuthError(authError.message));
      setIsSubmitting(false);
      return;
    }
    window.location.href = '/compte';
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-primary">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="h-11 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-primary">Mot de passe</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className="h-11 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
      </label>

      {error ? (
        <p role="alert" className="rounded-btn bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !email || !password}
        className="inline-flex h-12 items-center justify-center rounded-btn bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Connexion…' : 'Se connecter'}
      </button>

      <p className="text-center text-sm text-primary/70">
        Pas encore de compte&nbsp;?{' '}
        <a href="/inscription" className="font-medium text-accent hover:text-accent-hover">
          Créer un compte
        </a>
      </p>
    </form>
  );
}

function translateAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.';
  if (/email not confirmed/i.test(msg))
    return 'Vous devez confirmer votre adresse email avant de vous connecter.';
  if (/too many requests/i.test(msg)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return msg;
}
