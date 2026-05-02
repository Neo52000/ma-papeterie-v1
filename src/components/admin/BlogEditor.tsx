import { useEffect, useState } from 'react';
import AdminGuard from './AdminGuard';
import { useAdminFetch } from '@/lib/admin-fetch';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  cover_image_url: string | null;
  published_at: string | null;
  ai_generated: boolean;
  ai_prompt: string | null;
  author: string;
  reading_minutes: number | null;
}

export interface BlogEditorProps {
  /** Post id, or "nouveau" to create a fresh draft. */
  postId: string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export default function BlogEditor({ postId }: BlogEditorProps) {
  return <AdminGuard>{({ token }) => <Inner postId={postId} token={token} />}</AdminGuard>;
}

function Inner({ postId, token }: { postId: string; token: string }) {
  const isNew = postId === 'nouveau';
  const fetchUrl = isNew ? null : `/api/admin/blog/${postId}`;
  const { data, error } = useAdminFetch<{ post: BlogPost }>(fetchUrl ?? '', token);

  const [draft, setDraft] = useState<BlogPost>({
    id: '',
    slug: '',
    title: '',
    excerpt: '',
    content_md: '',
    cover_image_url: null,
    published_at: null,
    ai_generated: false,
    ai_prompt: null,
    author: 'Reine & Fils',
    reading_minutes: null,
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('pratique');
  const [aiLength, setAiLength] = useState<'court' | 'moyen' | 'long'>('moyen');
  const [aiState, setAiState] = useState<'idle' | 'generating' | 'error'>('idle');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hydrate the form once the GET resolves (only when editing an existing post).
  useEffect(() => {
    if (!data?.post) return;
    setDraft(data.post);
  }, [data]);

  const update = <K extends keyof BlogPost>(key: K, value: BlogPost[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const generateDraft = async () => {
    if (aiPrompt.trim().length < 5) return;
    setAiState('generating');
    try {
      const res = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ topic: aiPrompt, tone: aiTone, length: aiLength }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        draft: {
          title: string;
          slug: string;
          excerpt: string;
          content_md: string;
          reading_minutes: number;
          ai_prompt: string;
        };
      };
      setDraft((d) => ({
        ...d,
        title: json.draft.title,
        slug: d.slug || json.draft.slug,
        excerpt: json.draft.excerpt,
        content_md: json.draft.content_md,
        reading_minutes: json.draft.reading_minutes,
        ai_generated: true,
        ai_prompt: json.draft.ai_prompt,
      }));
      setAiState('idle');
    } catch {
      setAiState('error');
    }
  };

  const save = async (publish: boolean) => {
    setSaveState('saving');
    setSaveError(null);

    const slugTrim = draft.slug.trim();
    if (slugTrim && !SLUG_RE.test(slugTrim)) {
      setSaveState('error');
      setSaveError('Slug invalide (a-z, 0-9, tirets uniquement, ne commence pas par un tiret)');
      return;
    }

    const body = {
      title: draft.title,
      slug: slugTrim || undefined,
      excerpt: draft.excerpt,
      content_md: draft.content_md,
      cover_image_url: draft.cover_image_url ?? '',
      author: draft.author,
      ai_generated: draft.ai_generated,
      ai_prompt: draft.ai_prompt,
      publish,
    };

    const url = isNew ? '/api/admin/blog' : `/api/admin/blog/${postId}`;
    const method = isNew ? 'POST' : 'PATCH';
    try {
      const res = await fetch(url, {
        method,
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { post?: BlogPost; error?: string };
      if (!res.ok) {
        setSaveState('error');
        setSaveError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setSaveState('saved');
      if (isNew && json.post) {
        window.location.href = `/admin/blog/${json.post.id}`;
        return;
      }
      if (json.post) setDraft(json.post);
      window.setTimeout(() => setSaveState('idle'), 2000);
    } catch (e) {
      setSaveState('error');
      setSaveError(e instanceof Error ? e.message : 'unknown');
    }
  };

  const remove = async () => {
    if (isNew) return;
    if (!window.confirm('Supprimer cet article définitivement ?')) return;
    try {
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.location.href = '/admin/blog';
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'unknown');
    }
  };

  if (error && !isNew) {
    return (
      <p className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Erreur : {error}
      </p>
    );
  }

  if (!isNew && !data) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-btn bg-primary/10" />
        <div className="h-32 animate-pulse rounded-btn bg-primary/10" />
        <div className="h-96 animate-pulse rounded-btn bg-primary/10" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <section className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-primary">Génération IA</h2>
          <p className="mt-1 text-xs text-primary/60">
            Décris le sujet, le ton et la longueur. La rédaction reste révisable avant publication.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ex. Comment bien choisir un cahier pour la rentrée CM2 — papier, format, reliure"
            rows={3}
            className="mt-3 w-full rounded-btn border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-primary/70">
              Ton
              <input
                type="text"
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                placeholder="pratique, expert, famille…"
                className="mt-1 h-9 w-full rounded-btn border border-primary/15 bg-white px-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="text-xs text-primary/70">
              Longueur
              <select
                value={aiLength}
                onChange={(e) => setAiLength(e.target.value as 'court' | 'moyen' | 'long')}
                className="mt-1 h-9 w-full rounded-btn border border-primary/15 bg-white px-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="court">Court (300-500)</option>
                <option value="moyen">Moyen (500-800)</option>
                <option value="long">Long (900-1200)</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={generateDraft}
                disabled={aiState === 'generating' || aiPrompt.trim().length < 5}
                className="inline-flex h-9 w-full items-center justify-center rounded-btn bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiState === 'generating' ? 'Génération…' : '✨ Générer'}
              </button>
            </div>
          </div>
          {aiState === 'error' && (
            <p className="mt-2 text-xs text-danger">
              Erreur génération IA — vérifier OPENAI_API_KEY ou réessayer.
            </p>
          )}
        </section>

        <section className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60">
            Titre
            <input
              type="text"
              value={draft.title}
              onChange={(e) => update('title', e.target.value)}
              maxLength={200}
              className="mt-1 h-11 w-full rounded-btn border border-primary/15 bg-white px-3 text-base font-medium text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-primary/60">
            Slug (URL)
            <input
              type="text"
              value={draft.slug}
              onChange={(e) => update('slug', e.target.value)}
              maxLength={80}
              placeholder="auto depuis le titre si vide"
              className="mt-1 h-9 w-full rounded-btn border border-primary/15 bg-white px-3 font-mono text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-primary/60">
            Extrait (résumé court, ~150 caractères)
            <textarea
              value={draft.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              maxLength={500}
              rows={2}
              className="mt-1 w-full rounded-btn border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <span className="mt-1 block text-[10px] text-primary/40">
              {draft.excerpt.length} / 500 caractères
            </span>
          </label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-primary/60">
            Image de couverture (URL)
            <input
              type="url"
              value={draft.cover_image_url ?? ''}
              onChange={(e) => update('cover_image_url', e.target.value || null)}
              maxLength={500}
              placeholder="https://..."
              className="mt-1 h-9 w-full rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
        </section>

        <section className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60">
            Contenu (Markdown)
            <textarea
              value={draft.content_md}
              onChange={(e) => update('content_md', e.target.value)}
              maxLength={50_000}
              rows={20}
              className="mt-1 w-full rounded-btn border border-primary/15 bg-white px-3 py-2 font-mono text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <span className="mt-1 block text-[10px] text-primary/40">
              {draft.content_md.length.toLocaleString('fr-FR')} / 50 000 caractères ·{' '}
              {Math.max(1, Math.round(draft.content_md.split(/\s+/).filter(Boolean).length / 225))}{' '}
              min
            </span>
          </label>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Statut</p>
          <p className="mt-2 text-sm text-primary">
            {draft.published_at ? (
              <span className="inline-flex items-center rounded-badge bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                Publié
              </span>
            ) : (
              <span className="inline-flex items-center rounded-badge bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary/60 ring-1 ring-primary/10">
                Brouillon
              </span>
            )}
          </p>
          {draft.published_at && (
            <p className="mt-2 text-xs text-primary/60">
              Publié le {new Date(draft.published_at).toLocaleString('fr-FR')}
            </p>
          )}
          {draft.ai_generated && (
            <p className="mt-2 text-xs text-primary/60">
              ✨ Premier jet généré par IA{draft.ai_prompt && ` — sujet : "${draft.ai_prompt}"`}
            </p>
          )}
        </div>

        <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saveState === 'saving' || draft.title.trim().length === 0}
            className="inline-flex h-10 w-full items-center justify-center rounded-btn border border-primary/15 bg-white px-4 text-sm font-medium text-primary hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveState === 'saving' ? 'Enregistrement…' : 'Enregistrer le brouillon'}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saveState === 'saving' || draft.title.trim().length === 0}
            className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-btn bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {draft.published_at ? 'Mettre à jour & publier' : 'Publier'}
          </button>
          {!isNew && draft.published_at && (
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saveState === 'saving'}
              className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-btn border border-accent/30 bg-accent/5 px-4 text-xs font-medium text-accent hover:bg-accent/10"
            >
              Dépublier
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={remove}
              className="mt-4 inline-flex h-8 w-full items-center justify-center rounded-btn px-4 text-xs font-medium text-danger hover:bg-danger/5"
            >
              Supprimer définitivement
            </button>
          )}
          {saveState === 'saved' && <p className="mt-2 text-xs text-emerald-700">✓ Enregistré</p>}
          {saveError && <p className="mt-2 text-xs text-danger">{saveError}</p>}
        </div>

        {!isNew && draft.slug && draft.published_at && (
          <div className="rounded-card border border-primary/10 bg-white p-4 text-xs text-primary/60">
            <a
              href={`/blog/${draft.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              Voir l'article publié →
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}
