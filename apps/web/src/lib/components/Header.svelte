<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button, useTheme } from '@me/design-system';

	const theme = useTheme();

	// Breadcrumb segments are derived from the current pathname so adding a
	// new top-level route picks up a header crumb for free. The "SidLak" root
	// crumb is always present; any trailing segments are rendered as their
	// own capitalized crumbs separated by a divider glyph.
	const segments = $derived(page.url.pathname.split('/').filter(Boolean));
	const isHome = $derived(segments.length === 0);

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
