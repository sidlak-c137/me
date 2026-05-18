<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { Button, useTheme } from '@me/design-system';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
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
		// Title-case across hyphens so multi-word slugs like `paper-planes`
		// render as `Paper Planes` instead of `Paper-planes`.
		return seg
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
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
			<!-- Full breadcrumb on md+, leaf-only on phones. Intermediate
			     crumbs are real links to their own pages (e.g. the
			     `Explorations` crumb on `/explorations/paper-planes` goes
			     to `/explorations`) so up-navigation works without an
			     in-page back link per exploration. Below `md` the
			     intermediate pair (separator + link) is hidden to keep
			     the header on one line on phones; the full path is still
			     reachable by tapping the root crumb. Validation walks
			     the full path via `isKnownRoute`. -->
			<a
				href={resolve('/')}
				data-cursor="text"
				class="text-muted-foreground transition-colors hover:text-foreground"
			>
				SidLak
			</a>
			{#each segments as seg, i (seg)}
				{@const isLeaf = i === segments.length - 1}
				{@const href = resolve(('/' + segments.slice(0, i + 1).join('/')) as Pathname)}
				<span
					class="mx-2 text-subtle {isLeaf ? '' : 'hidden md:inline'}"
					aria-hidden="true">/</span
				>
				{#if isLeaf}
					<span class="text-foreground">{label(seg)}</span>
				{:else}
					<a
						{href}
						data-cursor="text"
						class="hidden text-muted-foreground transition-colors hover:text-foreground md:inline"
					>
						{label(seg)}
					</a>
				{/if}
			{/each}
		{/if}
	</nav>
	<Button
		variant="secondary"
		onclick={theme.toggle}
		data-cursor="hover"
		aria-label="Toggle color theme"
    class="px-3! md:px-5"
	>
		<!-- Both glyphs render but CSS gates them by the .dark class so SSR
		     and client emit identical markup — sidesteps the hydration
		     mismatch from reading reactive theme state before $effect runs.
		     The text labels collapse to icon-only on phones to match the
		     leaf-only breadcrumb; the aria-label on the button keeps the
		     action accessible at any width. -->
		<span aria-hidden="true" class="inline-flex dark:hidden">
			<Moon class="size-3.5" strokeWidth={1.75} />
		</span>
		<span aria-hidden="true" class="hidden dark:inline-flex">
			<Sun class="size-3.5" strokeWidth={1.75} />
		</span>
		<span class="hidden md:inline">
			<span class="dark:hidden">dark</span>
			<span class="hidden dark:inline">light</span>
		</span>
	</Button>
</header>
