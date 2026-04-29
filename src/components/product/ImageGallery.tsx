import { useState } from 'react';
import { cdnImage, cdnSrcSet } from '@/lib/cdn-image';

export interface ImageGalleryProps {
  images: string[];
  alt: string;
}

const isRemote = (url: string) => /^https?:\/\//i.test(url);

export default function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const safe = images.length > 0 ? images : ['/placeholder-product.svg'];
  const current = safe[Math.min(active, safe.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tabpanel"
        aria-label={alt}
        className="aspect-square w-full overflow-hidden rounded-card bg-bg-soft"
      >
        {isRemote(current) ? (
          <picture>
            <source type="image/avif" srcSet={cdnSrcSet(current, 600, 'avif')} />
            <source type="image/webp" srcSet={cdnSrcSet(current, 600, 'webp')} />
            <img
              src={cdnImage(current, { width: 600 })}
              alt={alt}
              width={600}
              height={600}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </picture>
        ) : (
          <img
            src={current}
            alt={alt}
            width={600}
            height={600}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-contain"
          />
        )}
      </div>
      {safe.length > 1 && (
        <ul className="flex flex-wrap gap-2" role="tablist" aria-label="Vignettes images produit">
          {safe.map((src, idx) => {
            const thumbSrc = isRemote(src) ? cdnImage(src, { width: 128 }) : src;
            return (
              <li key={src + idx}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={idx === active}
                  aria-label={`Image ${idx + 1} sur ${safe.length}`}
                  onClick={() => setActive(idx)}
                  className={`h-16 w-16 overflow-hidden rounded-btn border bg-white transition-colors ${
                    idx === active
                      ? 'border-accent ring-2 ring-accent/40'
                      : 'border-primary/10 hover:border-primary/30'
                  }`}
                >
                  <img
                    src={thumbSrc}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
