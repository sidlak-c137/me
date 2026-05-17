import { ROUTES, SITE_URL } from '$lib/seo';

// Prerendered alongside the rest of the site so the sitemap ships as a
// static file under the same origin as the pages it lists. The URL list
// is sourced from `$lib/seo` so adding a route is a one-line change that
// updates both the sitemap and the header breadcrumb whitelist in lockstep.
export const prerender = true;

export function GET() {
	const lastmod = new Date().toISOString().split('T')[0];
	const origin = SITE_URL.replace(/\/$/, '');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(
	(p) => `	<url>
		<loc>${origin}${p.path}</loc>
		<lastmod>${lastmod}</lastmod>
		<changefreq>${p.changefreq}</changefreq>
		<priority>${p.priority}</priority>
	</url>`
).join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
