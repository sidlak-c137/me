<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Cursor } from '@me/design-system';
	import Header from '$lib/components/Header.svelte';
	import { pageTransition } from '$lib/transition.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Cursor />
<div class="grid min-h-dvh grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground">
	<Header />
	{@render children()}
</div>

<!-- Cross-page wash. Mounted at the layout level so a single keyframe run
     spans both the originating page and the destination — the route swap
     happens at the midpoint, hidden under full coverage. The overlay sits
     above the shared header (z-50 vs z-20) so the sweep covers the
     breadcrumb and toggle along with the page content. -->
{#if pageTransition.active}
	<div class="wash pointer-events-none fixed inset-0 z-50 bg-accent" aria-hidden="true"></div>
{/if}

<style>
	/* Single-pass sweep: starts off-screen left, fills the viewport at
	   the midpoint, then exits to the right. `forwards` pins the final
	   state in case the overlay outlives the animation's end. */
	.wash {
		transform: translateX(-100%);
		animation: wash-sweep 1100ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
	}

	@keyframes wash-sweep {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(0%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.wash {
			animation: none;
			transform: translateX(100%);
		}
	}
</style>
