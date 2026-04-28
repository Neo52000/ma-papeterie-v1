import { useState, type FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const { error: authError } = await supabaseBrowser.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName.trim() || null },
        emailRedirectTo: `${window.location.origin}/compte`,
      },
    });
    setIsSubmitting(false);
    if (authError) {
      setError(translateAuthError(authError.message));
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="rounded-card bg-bg-soft p-6 text-center text-sm text-primary/80">
        <p className="font-medium text-primary">Compte créé&nbsp;!</p>
        <p className="mt-2">
          Un email de confirmation vous a été envoyé. Cliquez sur le lien à l'intérieur pour activer
          votre compte, puis revenez vous connecter.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-primary">Nom (optionnel)</span>
        <input
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isSubmitting}
          className="h-11 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
      </label>

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
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className="h-11 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
        <span className="text-sm text-primary/60">8 caractères minimum.</span>
      </label>

      {error ? (
        <p role="alert" className="rounded-btn bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !email || password.length < 8}
        className="inline-flex h-12 items-center justify-center rounded-btn bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Création…' : 'Créer mon compte'}
      </button>

      <p className="text-center text-sm text-primary/70">
        Déjà un compte&nbsp;?{' '}
        <a href="/connexion" className="font-medium text-accent hover:text-accent-hover">
          Se connecter
        </a>
      </p>
    </form>
  );
}

function translateAuthError(msg: string): string {
  if (/already registered|user already/i.test(msg))
    return 'Un compte existe déjà avec cette adresse email.';
  if (/password should be at least/i.test(msg))
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (/invalid email/i.test(msg)) return 'Adresse email invalide.';
  return msg;
}
