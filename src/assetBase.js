/** Root prefix for static assets (empty locally, project path on GitHub Pages). */
export function getAssetBase() {
    if (typeof location === 'undefined') {
        return '';
    }
    return location.pathname.startsWith('/echoes-of-the-basin')
        ? '/echoes-of-the-basin'
        : '';
}

export function assetPath(relativePath) {
    const cleaned = String(relativePath).replace(/^\.?\//, '');
    const base = getAssetBase();
    return base ? `${base}/${cleaned}` : cleaned;
}
