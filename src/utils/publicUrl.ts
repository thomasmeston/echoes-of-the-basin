function pageDir(): string {
  const { origin, pathname } = window.location;
  if (pathname.endsWith('/')) {
    return `${origin}${pathname}`;
  }
  if (pathname.endsWith('.html')) {
    return `${origin}${pathname.replace(/[^/]+$/, '')}`;
  }
  return `${origin}${pathname}/`;
}

/** Site-root asset URL. Always absolute so CSS `url()` is not resolved against `/assets/*.css`. */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? './';
  const normalized = path.replace(/^\//, '');
  const relative = `${base}${normalized}`;
  if (typeof window === 'undefined') {
    return relative;
  }
  return new URL(relative, pageDir()).href;
}

/** Bump when replacing `public/images/notebook_texture.png` so Pages/CDN drop the old sheet. */
export function notebookTextureUrl(): string {
  return `${publicUrl('images/notebook_texture.png')}?v=4`;
}
