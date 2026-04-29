// Helpers for Netlify Image CDN. Wraps any allowlisted remote URL (see
// `[images].remote_images` in netlify.toml) into a transformed URL served
// from `/.netlify/images`. Local public/ assets pass through unchanged.

const NETLIFY_PROXY_PREFIX = '/.netlify/images';

const isRemoteImage = (url: string) => /^https?:\/\//i.test(url);

export interface CdnImageOpts {
  /** Target width in CSS pixels. Default: 600. */
  width?: number;
  /** Output format. Default: original (CDN auto-negotiates). */
  format?: 'avif' | 'webp' | 'auto';
  /** Compression quality 1-100. Default: 78. */
  quality?: number;
}

export function cdnImage(url: string | null | undefined, opts: CdnImageOpts = {}): string {
  if (!url) return '';
  if (!isRemoteImage(url)) return url;
  const params = new URLSearchParams({ url });
  if (opts.width) params.set('w', String(opts.width));
  if (opts.format && opts.format !== 'auto') params.set('fm', opts.format);
  params.set('q', String(opts.quality ?? 78));
  return `${NETLIFY_PROXY_PREFIX}?${params.toString()}`;
}

/** Build a srcset for 1×/2× density at the given base width. */
export function cdnSrcSet(
  url: string | null | undefined,
  baseWidth: number,
  format?: 'avif' | 'webp',
): string {
  if (!url || !isRemoteImage(url)) return '';
  const x1 = cdnImage(url, { width: baseWidth, format });
  const x2 = cdnImage(url, { width: baseWidth * 2, format });
  return `${x1} 1x, ${x2} 2x`;
}
