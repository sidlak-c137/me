<script lang="ts">
	import '../app.css';
	import { Cursor } from '@me/design-system';
	import Header from '$lib/components/Header.svelte';
	import Car from '$lib/components/Car.svelte';
	import { pageTransition } from '$lib/transition.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href="/favicon.svg" type="image/svg+xml" /></svelte:head>
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
	<div class="wash pointer-events-none fixed inset-0 z-50 bg-accent" aria-hidden="true">
		<!-- The car sits out ahead of the pane's leading (right) edge, on the
		     page itself rather than over the fill, and a short accent tow-line
		     links the pane edge to the car's tail — so as the overlay sweeps
		     right it reads as the car dragging the green pane behind it. Both
		     are pinned to the edge so they inherit the pane's sweep; the car is
		     rotated 90° so its nose (which points up at rest) faces forward. -->
		<div class="wash-tow"></div>
		<div class="wash-car">
			<div class="wash-car-bob">
				<div class="wash-car-rig">
					<Car class="text-accent drop-shadow" />
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Single-pass sweep: starts off-screen left, fills the viewport at the
	   midpoint, then exits to the right. `forwards` pins the final state in
	   case the overlay outlives the animation's end. It reads as one flowing
	   motion: the drive-in (0–50%) keeps its long, slow gradual start but now
	   accelerates all the way into full coverage at 50%, and the exit (50–100%)
	   picks up at that same speed and eases out with a long gentle tail. The
	   two curves are matched at the midpoint so the car carries its momentum
	   straight through coverage — no settle, no jerk. */
	.wash {
		transform: translateX(calc(-100% - 140px));
		animation: wash-sweep 2000ms linear forwards;
	}

	@keyframes wash-sweep {
		0% {
			/* Start the pane far enough past the left edge that the car —
			   which is offset ahead of the pane's leading edge — sits fully
			   off-screen, so it drives in rather than spawning on the edge. */
			transform: translateX(calc(-100% - 140px));
			animation-timing-function: cubic-bezier(0.9, 0, 0.7, 0.4);
		}
		50% {
			/* Full coverage lands at the time-midpoint; the route handoff in
			   transition.svelte.ts is pinned to this moment so the swap stays
			   hidden under the fully-covering pane. */
			transform: translateX(0%);
			animation-timing-function: cubic-bezier(0.3, 0.6, 0.3, 1);
		}
		100% {
			transform: translateX(100%);
		}
	}

	/* Tow-line: a short accent strand from the pane's leading edge out to the
	   car's tail. `right: 0` pins it to that edge and translateX(100%) lays it
	   just outside the fill, on the page, so it visibly tethers car to pane. */
	.wash-tow {
		position: absolute;
		top: 50%;
		right: 0;
		width: 1.5rem;
		height: 3px;
		border-radius: 9999px;
		background: var(--accent);
		transform: translate(100%, -50%);
	}

	/* Car positioned out ahead of the leading edge (on the page, past the
	   fill). The fixed px offset clears the scaled car off the green so it
	   reads as pulling rather than riding the pane. It inherits the pane's
	   translateX sweep, so no separate horizontal animation is needed. The
	   three layers keep concerns apart: placement, suspension bob, orientation. */
	.wash-car {
		position: absolute;
		top: 50%;
		right: 0;
		transform: translate(63px, -50%);
	}

	.wash-car-bob {
		animation: wash-car-bob 520ms ease-in-out infinite alternate;
	}

	.wash-car-rig {
		transform: rotate(90deg) scale(2.6);
		transform-origin: center;
	}

	@keyframes wash-car-bob {
		from {
			transform: translateY(-1.5px);
		}
		to {
			transform: translateY(1.5px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.wash {
			animation: none;
			transform: translateX(100%);
		}

		.wash-car-bob {
			animation: none;
		}
	}
</style>
