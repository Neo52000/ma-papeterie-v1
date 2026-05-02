import { useEffect, useRef, useState } from 'react';

// Route an image through Netlify Image CDN for AVIF/WebP transcoding +
// responsive resizing. External URLs (https://) bypass — only optimize
// our own /public/ assets. q=80 keeps file weight reasonable.
function cdn(src: string, width: number, fm?: 'avif' | 'webp'): string {
  if (src.startsWith('http')) return src;
  const params = new URLSearchParams({ url: src, w: String(width), q: '80' });
  if (fm) params.set('fm', fm);
  return `/.netlify/images?${params.toString()}`;
}

// V5 parity (Phase 5.1 #3) — slider home hero.
//
// Custom impl, no external lib (~3 KB gzip vs Swiper's 30+).
// Autoplay 6s with pause on hover/focus. Keyboard ←/→ navigation,
// touch swipe on mobile, dots + arrows controls. Honors
// prefers-reduced-motion (no autoplay).
//
// SSR-safe: the Astro wrapper renders the first slide as static
// HTML so the LCP is good even before hydration. This component
// takes over once `client:visible` triggers.

export interface Slide {
  id: string;
  imageSrc: string;
  imageAlt: string;
  eyebrow?: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

interface Props {
  slides: Slide[];
  /** Auto-advance interval (ms). 0 = disabled. */
  autoplayMs?: number;
}

export default function HeroSlider({ slides, autoplayMs = 6000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const total = slides.length;
  const goTo = (i: number) => setIndex(((i % total) + total) % total);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Autoplay with prefers-reduced-motion guard.
  useEffect(() => {
    if (autoplayMs <= 0 || paused || total < 2) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = window.setTimeout(next, autoplayMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, autoplayMs, total]);

  // Keyboard ←/→ when slider focused.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (total === 0) return null;
  const slide = slides[index];

  return (
    <section
      ref={containerRef}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) {
          if (dx < 0) next();
          else prev();
        }
        touchStartX.current = null;
      }}
      aria-roledescription="carrousel"
      aria-label="Mises en avant"
      className="relative isolate overflow-hidden rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative aspect-[16/8] sm:aspect-[16/6] lg:aspect-[16/5]">
        <picture key={slide.id}>
          <source
            type="image/avif"
            srcSet={`${cdn(slide.imageSrc, 800, 'avif')} 800w, ${cdn(slide.imageSrc, 1280, 'avif')} 1280w, ${cdn(slide.imageSrc, 1920, 'avif')} 1920w`}
            sizes="(min-width: 1024px) 1280px, 100vw"
          />
          <source
            type="image/webp"
            srcSet={`${cdn(slide.imageSrc, 800, 'webp')} 800w, ${cdn(slide.imageSrc, 1280, 'webp')} 1280w, ${cdn(slide.imageSrc, 1920, 'webp')} 1920w`}
            sizes="(min-width: 1024px) 1280px, 100vw"
          />
          <img
            src={cdn(slide.imageSrc, 1280)}
            alt={slide.imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority={index === 0 ? 'high' : 'auto'}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding={index === 0 ? 'sync' : 'async'}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-center gap-3 p-6 text-white sm:max-w-[55%] sm:p-10 lg:p-14">
          {slide.eyebrow ? (
            <span className="text-xs font-semibold uppercase tracking-label text-accent">
              {slide.eyebrow}
            </span>
          ) : null}
          <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            {slide.title}
          </h2>
          <p className="text-sm text-white/90 sm:text-base sm:leading-relaxed">
            {slide.description}
          </p>
          <div>
            <a
              href={slide.ctaHref}
              className="inline-flex items-center gap-2 rounded-btn bg-accent px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent-hover"
            >
              {slide.ctaLabel}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Slide précédent"
            className="absolute left-3 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary shadow-card transition hover:bg-white"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Slide suivant"
            className="absolute right-3 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary shadow-card transition hover:bg-white"
          >
            <span aria-hidden="true">›</span>
          </button>
          <div
            role="tablist"
            aria-label="Sélection du slide"
            className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2"
          >
            {slides.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                type="button"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1} sur ${total}`}
                onClick={() => goTo(i)}
                className={
                  'h-2 rounded-full transition-all ' +
                  (i === index ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/80')
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
