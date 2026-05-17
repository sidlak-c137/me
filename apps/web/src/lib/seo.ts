// Single source of truth for site-wide SEO constants. Anything that needs
// the canonical origin (canonical/og:url tags, sitemap entries, JSON-LD)
// reads from here so the production URL only has to be updated in one
// place when DNS lands on a final domain.
export const SITE_URL = 'https://sidlak.me';

export const SITE_NAME = 'Sidharth Lakshmanan';

export const DEFAULT_DESCRIPTION =
	'Sidharth Lakshmanan — research engineer at Reve AI prototyping, building, and shipping frontend systems.';

// Default share image. Path is resolved against SITE_URL by the Seo
// component, so this stays a root-relative pathname.
export const DEFAULT_OG_IMAGE = '/og.png';

// Used for twitter:site / twitter:creator. Includes the leading @ so
// callers don't have to remember to prepend it.
export const TWITTER_HANDLE = '@theSidLak';

// Build a fully-qualified URL for a given path. Accepts both '/foo' and
// 'foo' and normalizes against SITE_URL.
export function absoluteUrl(path: string): string {
	if (/^https?:\/\//i.test(path)) return path;
	const base = SITE_URL.replace(/\/$/, '');
	const suffix = path.startsWith('/') ? path : `/${path}`;
	return `${base}${suffix}`;
}
