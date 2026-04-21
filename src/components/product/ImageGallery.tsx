import { useState } from 'react';

export interface ImageGalleryProps {
  images: string[];
  alt: string;
}

export default function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const safe = images.length > 0 ? images : ['/placeholder-product.svg'];
  const current = safe[Math.min(active, safe.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-square w-full overflow-hidden rounded-card bg-bg-soft">
        <img
          src={current}
          alt={alt}
          loading="eager"
          decoding="async"
          className="h-full w-full object-contain"
        />
      </div>
      {safe.length > 1 && (
        <ul className="flex flex-wrap gap-2" role="tablist" aria-label="Images produit">
          {safe.map((src, idx) => (
            <li key={src + idx}>
              <button
                type="button"
                role="tab"
                aria-selected={idx === active}
                onClick={() => setActive(idx)}
                className={`h-16 w-16 overflow-hidden rounded-btn border bg-white transition-colors ${
                  idx === active ? 'border-accent' : 'border-primary/10 hover:border-primary/30'
                }`}
              >
                <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
