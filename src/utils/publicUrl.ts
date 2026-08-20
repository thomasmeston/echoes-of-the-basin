export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? './';
  const normalized = path.replace(/^\//, '');
  return `${base}${normalized}`;
}

/** Bump when replacing `public/images/notebook_texture.png` so Pages/CDN drop the old sheet. */
export const NOTEBOOK_TEXTURE_URL = `${publicUrl('images/notebook_texture.png')}?v=3`;
