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

// ────────────────────────────────────────────────────────────────────────
// Route registry
// ────────────────────────────────────────────────────────────────────────
// Single source of truth for the public top-level routes the app serves.
// Consumed by the sitemap (URL list + change metadata) and the header
// (breadcrumb whitelist that gates which path segments are rendered as
// trusted content vs. discarded). Adding a new route here picks it up in
// both surfaces — important since a route the sitemap advertises but the
// header refuses to render would feel broken.

export type RouteEntry = {
	path: '/' | `/${string}`;
	changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority: string;
};

export const ROUTES: ReadonlyArray<RouteEntry> = [
	{ path: '/', changefreq: 'monthly', priority: '1.0' },
	{ path: '/elsewhere', changefreq: 'yearly', priority: '0.7' },
	{ path: '/explorations', changefreq: 'weekly', priority: '0.6' }
];

// Top-level URL segments (post-leading-slash). Used by the header to
// decide whether to render a breadcrumb crumb for the current pathname —
// anything outside this set is treated as user-controlled junk (404s,
// crafted phishing URLs, etc.) and the header collapses to just the
// root crumb instead of reflecting attacker text back into the chrome.
export const KNOWN_SEGMENTS: ReadonlySet<string> = new Set(
	ROUTES.map((r) => r.path.replace(/^\//, '')).filter((seg) => seg.length > 0)
);
