<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Button } from '@me/design-system';
	import TopoScene from '$lib/components/TopoScene.svelte';
	import { pageTransition } from '$lib/transition.svelte';

	// Hero intros are gated on `mounted` so transitions fire on the client
	// after hydration rather than being skipped on the initial SSR render.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<svelte:head>
	<title>Sidharth Lakshmanan</title>
	<meta name="description" content="Engineering with taste and care @ Reve AI." />
</svelte:head>

<main class="relative h-[calc(100dvh-5rem)] overflow-hidden bg-background text-foreground">
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
		<div class="relative max-w-xl">
			<div
				class="pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10"
				aria-hidden="true"
			></div>
			{#if mounted}
				<h1
					class="font-serif text-6xl leading-[0.95] italic select-none md:text-7xl lg:text-[5.5rem]"
					in:fly={{ y: 24, duration: 700, delay: 80, easing: quintOut }}
				>
					<span class="text-accent">Sid</span>harth<br /><span class="text-accent">Lak</span>shmanan
				</h1>
				<p
					class="text-md mt-8 max-w-md leading-relaxed text-muted-foreground select-none md:text-lg"
					in:fly={{ y: 20, duration: 700, delay: 220, easing: quintOut }}
				>
					I'm an engineer who thrives at materializing ideas into products. You can find me as a
					research engineer at Reve AI <span class="font-bold text-foreground"
						>prototyping, building, and shipping</span
					>
					many of our frontend systems.
				</p>

				<div
					class="mt-10 flex flex-wrap items-center gap-3"
					in:fly={{ y: 16, duration: 700, delay: 360, easing: quintOut }}
				>
					<Button variant="accent" href="/work">Explorations →</Button>
					<!-- Real href preserves middle/right-click and prefetch; the click
					     handler short-circuits the default navigation so the wash can
					     play on this page first, then hand off mid-sweep. -->
					<Button
						variant="primary"
						href="/contact"
						onclick={(e: MouseEvent) => {
							if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
							e.preventDefault();
							pageTransition.navigate('/contact');
						}}
					>
						Contact
					</Button>
				</div>
			{/if}
		</div>
	</section>
</main>
