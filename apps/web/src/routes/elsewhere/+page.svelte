<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import Mail from '@lucide/svelte/icons/mail';
	import Seo from '$lib/components/Seo.svelte';
	import { pageTransition } from '$lib/transition.svelte';

	// Entrance transitions only fire when this page is reached via a
	// page-transition navigation (e.g., the home page's Elsewhere button).
	// On a direct load or refresh `consumeIntro()` returns false, so the
	// content paints in place with no fly/stagger. `noIntro` is a no-op
	// transition function used in lieu of `fly` when we don't animate.
	const animate = pageTransition.consumeIntro();
	const noIntro = () => ({ duration: 0 });
	const flyIn = animate ? fly : noIntro;

	type Link = {
		label: string;
		// `handle` is what scrolls in on hover — the destination URL/address,
		// rendered as mono so it reads as a code-like reveal under the serif label.
		handle: string;
		href: string;
		external: boolean;
		icon: 'linkedin' | 'x' | 'github' | 'mail';
		// Two coordinate sets so each breakpoint is tuned independently. Desktop
		// is two staggered columns (rows alternate sides for a zigzag read);
		// mobile is a single left-aligned stack since the viewport can't hold
		// two columns of large serif text. Per-item `floatDur` / `floatDelay`
		// keep the vertical bob out of phase so the four never pulse in unison.
		top: string;
		left: string;
		topSm: string;
		leftSm: string;
		floatDur: string;
		floatDelay: string;
		floatAmp: string;
	};

	const links: Link[] = [
		{
			label: 'LinkedIn',
			handle: 'linkedin.com/in/sidharth-lakshmanan',
			href: 'https://www.linkedin.com/in/sidharth-lakshmanan',
			external: true,
			icon: 'linkedin',
			top: '12%',
			left: '8%',
			topSm: '6%',
			leftSm: '6%',
			floatDur: '7.2s',
			floatDelay: '0s',
			floatAmp: '-10px'
		},
		{
			label: 'X.com',
			handle: 'x.com/theSidLak',
			href: 'https://x.com/theSidLak',
			external: true,
			icon: 'x',
			top: '30%',
			left: '54%',
			topSm: '30%',
			leftSm: '6%',
			floatDur: '8.6s',
			floatDelay: '-1.4s',
			floatAmp: '-8px'
		},
		{
			label: 'GitHub',
			handle: 'github.com/sidlak-c137',
			href: 'https://github.com/sidlak-c137',
			external: true,
			icon: 'github',
			top: '52%',
			left: '8%',
			topSm: '54%',
			leftSm: '6%',
			floatDur: '9.4s',
			floatDelay: '-0.6s',
			floatAmp: '-9px'
		},
		{
			label: 'Email',
			handle: 'sidharth.m.lakshmanan@gmail.com',
			href: 'mailto:sidharth.m.lakshmanan@gmail.com',
			external: false,
			icon: 'mail',
			top: '70%',
			left: '54%',
			topSm: '78%',
			leftSm: '6%',
			floatDur: '10.2s',
			floatDelay: '-2.3s',
			floatAmp: '-7px'
		}
	];
</script>

<Seo
	title="Elsewhere"
	description="Find Sidharth Lakshmanan elsewhere on the web — LinkedIn, X, GitHub, and email."
/>

<main class="relative h-full min-h-0 overflow-hidden bg-background text-foreground">
	<!-- Visually hidden H1 so the page carries a real top-level heading for
	     crawlers and screen readers; the visible layout is a constellation
	     of links rather than a titled section, so the H1 doesn't appear on
	     screen but still anchors the document outline. -->
	<h1 class="sr-only">Elsewhere — Sidharth Lakshmanan on the web</h1>
	<section class="relative z-10 h-full px-6 md:px-12 lg:px-20">
		<ul class="scatter relative mx-auto h-full w-full list-none md:max-w-5xl">
			{#each links as link, i (link.label)}
				<li
					style="--li-top: {link.top}; --li-left: {link.left}; --li-top-sm: {link.topSm}; --li-left-sm: {link.leftSm};"
					in:flyIn={{ y: 28, duration: 700, delay: 800 + i * 90, easing: quintOut }}
				>
					<div
						class="float inline-block"
						style="--float-dur: {link.floatDur}; --float-delay: {link.floatDelay}; --float-amp: {link.floatAmp};"
					>
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<a
							href={link.href}
							data-cursor="text"
							target={link.external ? '_blank' : undefined}
							rel={link.external ? 'noopener noreferrer' : undefined}
							class="group inline-flex items-center gap-5 text-foreground transition-colors duration-200 hover:text-accent md:gap-7"
						>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
							<span
								class="inline-flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200 group-hover:text-accent md:h-12 md:w-12"
								aria-hidden="true"
							>
								{#if link.icon === 'linkedin'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="h-8 w-8 md:h-10 md:w-10"
									>
										<path
											d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"
										/>
									</svg>
								{:else if link.icon === 'x'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="h-7 w-7 md:h-9 md:w-9"
									>
										<path
											d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"
										/>
									</svg>
								{:else if link.icon === 'github'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="h-8 w-8 md:h-10 md:w-10"
									>
										<path
											d="M12 .5C5.73.5.67 5.56.67 11.83c0 5.02 3.25 9.27 7.76 10.77.57.1.78-.24.78-.54 0-.27-.01-1.16-.02-2.1-3.16.69-3.83-1.34-3.83-1.34-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.14.08 1.74 1.17 1.74 1.17 1.02 1.75 2.67 1.24 3.32.95.1-.74.4-1.24.72-1.53-2.52-.29-5.17-1.26-5.17-5.6 0-1.24.44-2.25 1.17-3.04-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.16.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.47 3.14-1.16 3.14-1.16.63 1.57.23 2.73.12 3.02.73.79 1.16 1.8 1.16 3.04 0 4.35-2.65 5.3-5.18 5.59.41.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.11 0 .3.2.65.79.54 4.51-1.5 7.75-5.75 7.75-10.77C23.33 5.56 18.27.5 12 .5z"
										/>
									</svg>
								{:else}
									<Mail class="h-8 w-8 md:h-10 md:w-10" strokeWidth={1.5} />
								{/if}
							</span>

							<!-- Two-line swap: the serif label and the mono handle share a
								     single grid cell, so the container width = max(label, handle)
								     and the icon never reflows when the handle reveals. The cell
								     clips overflow; each child translates + fades in lockstep. -->
							<span class="swap relative inline-grid overflow-hidden align-middle">
								<span
									class="swap-label col-start-1 row-start-1 self-center font-serif text-5xl leading-[0.95] italic md:text-6xl lg:text-7xl"
								>
									{link.label}
								</span>
								<span
									class="swap-handle col-start-1 row-start-1 self-center font-mono text-base tracking-tight lowercase md:text-2xl lg:text-3xl"
								>
									{link.handle}
								</span>
							</span>
						</a>
					</div>
				</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	/* Scatter layout. Items are absolutely positioned at every breakpoint; the
	   small-screen coordinates (`--li-*-sm`) are used by default, and the md+
	   override swaps in the desktop set. Using two coordinate sets is what
	   makes the mobile constellation actually scatter — sharing percentages
	   with desktop would either collapse items into a column or push them off
	   the right edge once the viewport narrows. */
	.scatter > li {
		position: absolute;
		top: var(--li-top-sm);
		left: var(--li-left-sm);
	}

	@media (min-width: 768px) {
		.scatter > li {
			top: var(--li-top);
			left: var(--li-left);
		}
	}

	/* Idle bob. Each `.float` instance reads its own duration/delay/amplitude
	   from inline custom properties so the four links never sync into one
	   collective pulse. Lives on a child of the `<li>` to avoid clobbering
	   Svelte's entrance `in:fly` transform. */
	.float {
		animation: float-bob var(--float-dur, 7s) ease-in-out var(--float-delay, 0s) infinite;
		will-change: transform;
	}

	@keyframes float-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(var(--float-amp, -10px));
		}
	}

	/* Swap reveal. Label and handle share a single grid cell; on hover the
	   label slides up and fades while the handle rises from below into the
	   same baseline. Transitions are declared once on both children so they
	   animate in lockstep — no group-hover variant per axis needed. */
	.swap-label,
	.swap-handle {
		transition:
			transform 200ms cubic-bezier(0.65, 0, 0.35, 1),
			opacity 200ms cubic-bezier(0.65, 0, 0.35, 1);
	}

	.swap-handle {
		transform: translateY(0.9rem);
		opacity: 0;
	}

	.group:hover .swap-label,
	.group:focus-visible .swap-label {
		transform: translateY(-0.9rem);
		opacity: 0;
	}

	.group:hover .swap-handle,
	.group:focus-visible .swap-handle {
		transform: translateY(0);
		opacity: 1;
	}

	/* Mobile: hover isn't reliable on touch, so the handle reveal is dropped
	   entirely — only the label shows. The cell is clamped to the viewport
	   width and the label is truncated with ellipsis so it can't push the
	   row past the right edge. `min-width: 0` lets the child honor
	   `text-overflow: ellipsis` instead of forcing the cell to grow. */
	@media (max-width: 767px) {
		.swap {
			max-width: calc(100vw - 6rem);
			min-width: 0;
		}
		.swap-handle {
			display: none;
		}
		.swap-label {
			max-width: 100%;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			transform: none !important;
			opacity: 1 !important;
			transition: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.float {
			animation: none;
		}
		.swap-label,
		.swap-handle {
			transition: opacity 200ms ease;
			transform: none;
		}
		.group:hover .swap-label,
		.group:focus-visible .swap-label {
			transform: none;
			opacity: 0;
		}
		.group:hover .swap-handle,
		.group:focus-visible .swap-handle {
			transform: none;
			opacity: 1;
		}
	}
</style>
