<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button, useTheme } from '@me/design-system';
	import { KNOWN_SEGMENTS } from '$lib/seo';

	const theme = useTheme();

	// Breadcrumb rendering whitelists segments against the registered route
	// list. The URL pathname is attacker-controllable — anyone can craft a
	// link like `/please-call-1-800-scam` and have SvelteKit route it to the
	// error page, which still renders inside this layout. Without a whitelist
	// the header would reflect that attacker text in trusted site chrome,
	// which is a passable phishing surface even though Svelte's auto-escape
	// blocks the XSS bit. Rendering only segments we recognize keeps the
	// header to "SidLak" for any unknown path — including typos on real
	// routes that resolve to 404.
	const segments = $derived(page.url.pathname.split('/').filter(Boolean));
	const isHome = $derived(segments.length === 0);
	const isKnownRoute = $derived(
		segments.length > 0 && segments.every((seg) => KNOWN_SEGMENTS.has(seg))
	);

	function label(seg: string) {
		return seg.charAt(0).toUpperCase() + seg.slice(1);
	}
</script>

<!-- Shared site header. Sits at z-20 — below the cross-page wash overlay
     (z-50) — so the sweep covers the header on forward navigations. The
     SidLak crumb is a plain `<a href="/">` so navigating back home is a
     standard SvelteKit nav with no wash, leaving the forward trip as the
     only animated transition. -->
<header class="relative z-20 flex items-center justify-between px-6 py-5 md:px-10 md:py-6">
	<nav class="font-mono text-[0.7rem] tracking-[0.22em] uppercase" aria-label="Breadcrumb">
		{#if isHome}
			<span class="text-muted-foreground">SidLak</span>
		{:else if !isKnownRoute}
			<!-- Unknown path (typo, crafted URL, etc.). Render only the root
			     crumb as a link home so the header stays useful but doesn't
			     reflect the unknown segment back into the page chrome. -->
			<a
				href={resolve('/')}
				data-cursor="text"
				class="text-muted-foreground transition-colors hover:text-foreground"
			>
				SidLak
			</a>
		{:else}
			<a
				href={resolve('/')}
				data-cursor="text"
				class="text-muted-foreground transition-colors hover:text-foreground"
			>
				SidLak
			</a>
			{#each segments as seg, i (seg)}
				<span class="mx-2 text-subtle" aria-hidden="true">/</span>
				<span class={i === segments.length - 1 ? 'text-foreground' : 'text-muted-foreground'}>
					{label(seg)}
				</span>
			{/each}
		{/if}
	</nav>
	<Button
		variant="secondary"
		onclick={theme.toggle}
		data-cursor="hover"
		aria-label="Toggle color theme"
	>
		<!-- Both glyphs render but CSS gates them by the .dark class so SSR
		     and client emit identical markup — sidesteps the hydration
		     mismatch from reading reactive theme state before $effect runs. -->
		<span aria-hidden="true" class="dark:hidden">☾</span>
		<span aria-hidden="true" class="hidden dark:inline">☀</span>
		<span class="dark:hidden">dark</span>
		<span class="hidden dark:inline">light</span>
	</Button>
</header>
