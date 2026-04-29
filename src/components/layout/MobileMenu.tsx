import { useEffect, useRef, useState } from 'react';

// Full-height slide-in drawer for mobile navigation. Replaces the previous
// <details>-based disclosure: focus trap, body scroll lock, ESC + backdrop
// dismissal, keyboard-friendly. Mounted at md:hidden — desktop nav lives in
// the inline header markup.

const NAV_LINKS = [
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/liste-scolaire', label: 'Liste scolaire' },
  { href: '/devis', label: 'Devis B2B' },
];

const SECONDARY_LINKS = [
  { href: '/compte', label: 'Mon compte' },
  { href: '/compte/favoris', label: 'Mes favoris' },
  { href: '/livraison-retour', label: 'Livraison & retours' },
  { href: '/cgv', label: 'CGV' },
  { href: '/mentions-legales', label: 'Mentions légales' },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        className="inline-flex h-10 w-10 items-center justify-center rounded-btn text-primary hover:bg-bg-soft md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer le menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-primary/40 backdrop-blur-sm"
          />
          <div
            ref={panelRef}
            id="mobile-menu-panel"
            className="absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col bg-white shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-primary/10 px-4">
              <span className="font-display text-base font-semibold text-primary">Menu</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-btn text-primary hover:bg-bg-soft"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form
              method="get"
              action="/catalogue"
              role="search"
              className="border-b border-primary/10 p-4"
            >
              <label htmlFor="mobile-menu-search" className="sr-only">
                Rechercher
              </label>
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary/50"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  id="mobile-menu-search"
                  type="search"
                  name="q"
                  placeholder="Rechercher…"
                  className="h-11 w-full rounded-btn border border-primary/15 bg-white pl-10 pr-3 text-sm text-primary placeholder:text-primary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </form>

            <nav aria-label="Navigation mobile" className="flex-1 overflow-y-auto p-2">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="block rounded-btn px-3 py-3 text-base font-medium text-primary hover:bg-bg-soft"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              <hr className="my-3 border-primary/10" />

              <ul className="flex flex-col gap-1">
                {SECONDARY_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="block rounded-btn px-3 py-2 text-sm text-primary/80 hover:bg-bg-soft hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="border-t border-primary/10 p-4 text-xs text-primary/60">
              <p className="font-medium text-primary">Ma Papeterie — Reine &amp; Fils</p>
              <p className="mt-1">Chaumont (52) · 03 10 96 02 24</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
