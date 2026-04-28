import { useEffect, useRef, useState } from 'react';

interface SearchResult {
  id: string;
  name: string;
  slug: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  priceTtc: number | null;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const DEBOUNCE_MS = 250;

export default function HeaderSearchAutocomplete({
  placeholder = 'Rechercher un produit, une marque, un EAN…',
  inputId = 'header-search',
}: {
  placeholder?: string;
  inputId?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLFormElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Debounced fetch.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      fetch(`/api/products/search?q=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((json: { results?: SearchResult[] }) => {
          setResults(json.results ?? []);
          setIsLoading(false);
        })
        .catch((err) => {
          if ((err as Error).name === 'AbortError') return;
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      const r = results[activeIdx];
      if (r?.slug) window.location.href = `/produit/${r.slug}`;
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <form
      ref={containerRef}
      method="get"
      action="/catalogue"
      role="search"
      className="relative w-full"
      onSubmit={() => setIsOpen(false)}
    >
      <label htmlFor={inputId} className="sr-only">
        Rechercher dans le catalogue
      </label>
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
        id={inputId}
        type="search"
        name="q"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIdx(-1);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKey}
        role="combobox"
        aria-controls={`${inputId}-listbox`}
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        className="h-10 w-full rounded-btn border border-primary/15 bg-white pl-10 pr-3 text-sm text-primary placeholder:text-primary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />

      {showDropdown ? (
        <div
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-card bg-white shadow-card-hover"
        >
          {isLoading && results.length === 0 ? (
            <p className="p-4 text-sm text-primary/60">Recherche…</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-primary/60">
              Aucun résultat. Tapez Entrée pour voir le catalogue complet.
            </p>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={r.id} role="option" aria-selected={i === activeIdx}>
                  <a
                    href={r.slug ? `/produit/${r.slug}` : '#'}
                    className={`flex items-center gap-3 px-4 py-2 text-sm hover:bg-bg-soft ${i === activeIdx ? 'bg-bg-soft' : ''}`}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <span className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-btn bg-bg-soft">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt=""
                          width={40}
                          height={40}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain"
                        />
                      ) : null}
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="line-clamp-1 font-medium text-primary">{r.name}</span>
                      {r.brand ? <span className="text-xs text-primary/60">{r.brand}</span> : null}
                    </span>
                    {r.priceTtc != null ? (
                      <span className="text-sm font-semibold text-primary">
                        {eur.format(r.priceTtc)}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
              <li className="border-t border-primary/10">
                <button
                  type="submit"
                  className="block w-full px-4 py-2 text-left text-sm text-accent hover:bg-bg-soft"
                >
                  Voir tous les résultats pour «&nbsp;{query.trim()}&nbsp;»
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </form>
  );
}
