<script lang="ts">
	import { page } from '$app/state';
	import {
		SITE_URL,
		SITE_NAME,
		DEFAULT_DESCRIPTION,
		DEFAULT_OG_IMAGE,
		TWITTER_HANDLE,
		absoluteUrl
	} from '$lib/seo';

	// Per-page SEO surface. Emits the standard set of tags into <svelte:head>
	// so each route only declares what's unique about itself (title, copy)
	// instead of duplicating the OG/Twitter boilerplate. All optional props
	// fall back to sensible site-wide defaults from $lib/seo.
	type Props = {
		// Page title without the site-name suffix. Pass `null` to render the
		// site name alone (used on the home page where the brand IS the title).
		title?: string | null;
		description?: string;
		// Root-relative path of the og:image. Resolved against SITE_URL.
		image?: string;
		// og:type — 'website' for index/landing pages, 'article' for posts.
		type?: 'website' | 'article' | 'profile';
		// Override the canonical/og:url. Defaults to the current pathname.
		// Useful for paginated routes or when collapsing variants.
		canonicalPath?: string;
		// When true, emits a robots meta tag preventing indexing. Lets us
		// keep the same component on draft/internal routes if any appear.
		noindex?: boolean;
	};

	let {
		title = null,
		description = DEFAULT_DESCRIPTION,
		image = DEFAULT_OG_IMAGE,
		type = 'website',
		canonicalPath,
		noindex = false
	}: Props = $props();

	// Title format: "Page — Sidharth Lakshmanan". Home passes `null` so the
	// suffix renders alone without a stray em-dash.
	const fullTitle = $derived(title ? `${title} — ${SITE_NAME}` : SITE_NAME);

	// Canonical resolves against the runtime pathname when not provided.
	// `page.url.pathname` is reactive across navigations so the tag stays
	// in sync without a layout-level reset.
	const canonical = $derived(absoluteUrl(canonicalPath ?? page.url.pathname));
	const ogImage = $derived(absoluteUrl(image));
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}

	<!-- Open Graph -->
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter / X. `summary_large_image` is the wider preview card; falls
	     back gracefully when no image is present. -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content={TWITTER_HANDLE} />
	<meta name="twitter:creator" content={TWITTER_HANDLE} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>
