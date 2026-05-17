<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '@me/design-system';
	import TopoScene from '$lib/components/TopoScene.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { pageTransition } from '$lib/transition.svelte';
	import { SITE_URL } from '$lib/seo';

	// Hero markup is rendered unconditionally so the prerendered HTML carries
	// the headline + intro copy (otherwise the SSR snapshot Google fetches
	// would be empty). The intro animation is driven by a CSS class added
	// after hydration — `mounted` only gates the visual reveal, not the DOM.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	// JSON-LD Person schema. Fed by the same handles the /elsewhere page
	// renders so a single edit keeps SERP knowledge-panel data, the social
	// links page, and any future surfaces in lock-step.
	const personSchema = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: 'Sidharth Lakshmanan',
		alternateName: 'Sid Lakshmanan',
		url: SITE_URL,
		jobTitle: 'Research Engineer',
		worksFor: { '@type': 'Organization', name: 'Reve AI' },
		sameAs: [
			'https://www.linkedin.com/in/sidharth-lakshmanan',
			'https://x.com/theSidLak',
			'https://github.com/sidlak-c137'
		]
	};
</script>

<Seo
	title={null}
	description="Sidharth Lakshmanan — research engineer at Reve AI prototyping, building, and shipping frontend systems."
	type="profile"
/>

<svelte:head>
	<!-- The `<\/script>` escape is required so the Svelte parser doesn't read
	     the literal `</script>` inside this template string as the close of a
	     `<script>` block. Once compiled the closing tag is emitted correctly
	     into the SSR HTML so search engines see a well-formed JSON-LD block. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags, no-useless-escape -->
	{@html `<script type="application/ld+json">${JSON.stringify(personSchema)}<\/script>`}
</svelte:head>

<main class="relative h-full min-h-0 overflow-hidden bg-background text-foreground">
	<!-- Topo-sand surface as a full-bleed background. Fixed so it stays in
	     place under any scrolling content; -z-0 keeps it behind the hero.
	     Spans the full viewport (not just main) so the surface still reads
	     edge-to-edge underneath the shared layout header. -->
	<div class="fixed inset-0 z-0" aria-hidden="true">
		<TopoScene />
	</div>

	<!-- Hero copy overlays the topo surface. A soft radial gradient behind
	     the column lifts the type off the lines without hard-edged panels. -->
	<section class="relative z-10 flex h-full items-center px-6 md:px-12 lg:px-20">
		<div class="relative max-w-xl" class:is-mounted={mounted}>
			<div
				class="pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10"
				aria-hidden="true"
			></div>
			<h1
				class="hero-intro hero-intro-1 font-serif text-6xl leading-[0.95] text-foreground italic select-none md:text-7xl lg:text-[5.5rem]"
			>
				<span class="text-accent">Sid</span>harth<br /><span class="text-accent">Lak</span>shmanan
			</h1>
			<p
				class="hero-intro hero-intro-2 text-md mt-8 max-w-md leading-relaxed text-muted-foreground select-none md:text-lg"
			>
				I'm an engineer who thrives at materializing ideas into products. You can find me as a
				research engineer at Reve AI <span class="font-bold text-foreground"
					>prototyping, building, and shipping</span
				>
				many of our frontend systems.
			</p>

			<div class="hero-intro hero-intro-3 mt-10 flex flex-wrap items-center gap-3">
				<!-- Real href preserves middle/right-click and prefetch; the click
				     handler short-circuits the default navigation so the wash can
				     play on this page first, then hand off mid-sweep. -->
				<Button
					variant="primary"
					href="/elsewhere"
					onclick={(e: MouseEvent) => {
						if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
						e.preventDefault();
						pageTransition.navigate('/elsewhere');
					}}
				>
					Elsewhere
				</Button>
			</div>
		</div>
	</section>
</main>

<style>
	/* Pre-mount hero state. Elements are rendered into the SSR HTML so
	   crawlers see the headline + body copy, then CSS hides them until the
	   `.is-mounted` class is applied by onMount. Mirrors the original
	   fly-in feel (24px lift, 700ms, staggered) without gating the DOM
	   itself behind a client-only flag. */
	.hero-intro {
		opacity: 0;
		transform: translateY(24px);
		transition:
			opacity 700ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.hero-intro-1 {
		transition-delay: 80ms;
	}
	.hero-intro-2 {
		transform: translateY(20px);
		transition-delay: 220ms;
	}
	.hero-intro-3 {
		transform: translateY(16px);
		transition-delay: 360ms;
	}

	.is-mounted .hero-intro {
		opacity: 1;
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-intro {
			transition: opacity 200ms ease;
			transform: none;
		}
	}
</style>
