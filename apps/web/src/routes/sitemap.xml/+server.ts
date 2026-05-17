import { SITE_URL } from '$lib/seo';

// Prerendered alongside the rest of the site so the sitemap ships as a
// static file under the same origin as the pages it lists. Update the
// `pages` list when adding a new top-level route.
export const prerender = true;

const pages: Array<{ path: string; changefreq: string; priority: string }> = [
	{ path: '/', changefreq: 'monthly', priority: '1.0' },
	{ path: '/elsewhere', changefreq: 'yearly', priority: '0.7' }
];

export function GET() {
	const lastmod = new Date().toISOString().split('T')[0];
	const origin = SITE_URL.replace(/\/$/, '');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(p) => `	<url>
		<loc>${origin}${p.path}</loc>
		<lastmod>${lastmod}</lastmod>
		<changefreq>${p.changefreq}</changefreq>
		<priority>${p.priority}</priority>
	</url>`
	)
	.join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
