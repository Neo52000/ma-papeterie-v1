import { useState } from 'react';

// V5 parity (Phase 5.1) — section témoignages avec carte unique
// affichée à la fois + dots de navigation. Pas d'autoplay (laisse
// le visiteur lire à son rythme).

export interface Testimonial {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
  author: string;
  role: string;
  date?: string;
}

interface Props {
  testimonials: Testimonial[];
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 'cned-leclerc',
    rating: 5,
    quote:
      'Partenaire stratégique depuis 5 ans. Fiabilité d’approvisionnement, innovations de service, dialogue permanent… Ma Papeterie comprend les enjeux de la pédagogie.',
    author: 'Jean-Pierre Leclerc',
    role: 'Responsable Approvisionnement, CNED (Centre National d’Enseignement à Distance)',
    date: 'Novembre 2025',
  },
];

export default function TestimonialsV5({ testimonials = DEFAULT_TESTIMONIALS }: Props) {
  const [index, setIndex] = useState(0);
  const total = testimonials.length;
  if (total === 0) return null;
  const t = testimonials[index];

  return (
    <section className="bg-bg-soft py-14" aria-label="Témoignages clients">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <span className="label-category">Témoignages</span>
        <h2 className="mt-3 font-display text-3xl font-semibold text-primary sm:text-4xl">
          Ce que nos clients disent
        </h2>
        <p className="mt-3 text-sm text-primary/70">
          Découvrez comment Ma Papeterie aide les écoles et établissements à améliorer leur gestion
          logistique
        </p>

        <article className="mt-10 rounded-card border border-primary/10 bg-white p-8 text-left shadow-card">
          <div className="flex items-center gap-1 text-accent" aria-label={`${t.rating} étoiles sur 5`}>
            {Array.from({ length: t.rating }).map((_, i) => (
              <svg
                key={i}
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2Z" />
              </svg>
            ))}
          </div>
          <blockquote className="mt-4 text-base italic text-primary sm:text-lg">
            &laquo;&nbsp;{t.quote}&nbsp;&raquo;
          </blockquote>
          <footer className="mt-6">
            <p className="font-semibold text-primary">{t.author}</p>
            <p className="text-xs text-primary/60">{t.role}</p>
            {t.date ? <p className="mt-1 text-xs text-primary/40">{t.date}</p> : null}
          </footer>
        </article>

        {total > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-4" role="tablist">
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + total) % total)}
              aria-label="Témoignage précédent"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/15 bg-white text-primary hover:border-accent"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((tt, i) => (
                <button
                  key={tt.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Témoignage ${i + 1} sur ${total}`}
                  onClick={() => setIndex(i)}
                  className={
                    'h-2 rounded-full transition-all ' +
                    (i === index ? 'w-6 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/60')
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % total)}
              aria-label="Témoignage suivant"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/15 bg-white text-primary hover:border-accent"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
