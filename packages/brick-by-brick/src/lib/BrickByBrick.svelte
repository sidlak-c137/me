<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { createBrickScene } from './scene';
	// Baked LDraw OMR data for the adult set (see scripts/fetch-omr.mjs) —
	// the kicker's numbers come from data, not copy, so they can't drift.
	import setData from './data/saturn-v.json';

	// Entrance animations are opt-in via prop so the host route can gate them
	// on the cross-page wash (same pattern as /explorations and /elsewhere).
	let { animate = false }: { animate?: boolean } = $props();
	const noIntro = () => ({ duration: 0 });
	// `animate` is a `$props()` value, so reading it through `$derived` keeps
	// the transition selection reactive instead of capturing only the initial
	// value at module init.
	const flyIn = $derived(animate ? fly : noIntro);

	// The build scene scrubs off document scroll: 0 at the top of the page,
	// 1 with the last section fully in view. Progress is global (not
	// per-section) — the scene module owns the mapping from progress to
	// section phases so the choreography lives in one place.
	let canvas: HTMLCanvasElement;

	onMount(() => {
		const scene = createBrickScene(canvas);
		const onScroll = () => {
			const doc = document.documentElement;
			const max = doc.scrollHeight - window.innerHeight;
			scene.setProgress(max > 0 ? window.scrollY / max : 0);
		};
		const onResize = () => {
			scene.resize(window.innerWidth, window.innerHeight);
			onScroll();
		};
		onResize();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onResize);
			scene.dispose();
		};
	});

	// One vignette per scroll section. The narrative arc is fixed —
	// build → forced teardown → building from the tub → dormancy →
	// the return → coda — but every memory below is PLACEHOLDER copy
	// (invented details, real set numbers) to be swapped for the real
	// thing. `kicker` is the mono eyebrow; `lead` is the accented first
	// phrase of the serif body; `align` alternates the column across
	// sections on md+; the scene mirrors it with a screen-space frame
	// shift so the build always sits opposite the prose.
	type Vignette = {
		kicker: string;
		lead: string;
		body: string;
		align: 'left' | 'right';
	};

	const vignettes: Vignette[] = [
		{
			kicker: '2004 · Set 4767 · 265 pieces',
			lead: 'The first one',
			body:
				'was a dragon. I followed every numbered step like scripture, terrified of ' +
				'skipping page eleven. When it was done I put it on the dresser, angled toward ' +
				'the door, so it was the first thing anyone saw.',
			align: 'left'
		},
		{
			kicker: 'The shelf rule',
			lead: 'Two weeks.',
			body:
				'That was the rule. My dad would tap the shelf on his way past — time. I wanted a ' +
				'museum; he handed me the tub. I broke the dragon apart piece by piece and hated ' +
				'him a little, quietly, the way you can only hate someone who is right.',
			align: 'right'
		},
		{
			kicker: 'The tub · every set at once',
			lead: 'No instructions',
			body:
				'survive the tub. Wings off the dragon ended up on a fire truck. Castle walls ' +
				'became a launch tower. Nothing I built matched a box anymore, which meant ' +
				'nothing I built could be wrong.',
			align: 'left'
		},
		{
			kicker: 'The closet years',
			lead: 'The tub went quiet',
			body:
				'somewhere around ninth grade. It sat on the closet floor under a sleeping bag, ' +
				'and I stepped over it for years without once thinking of it as mine.',
			align: 'right'
		},
		{
			kicker: `${setData.year} · Set ${setData.set.replace(/-1$/, '')} · ${setData.numParts.toLocaleString('en-US')} pieces`,
			lead: 'I build things',
			body:
				'for a living now — prototypes get shipped, torn apart, rebuilt from the same ' +
				`pieces. Last winter I bought the ${setData.name}: ${setData.numParts.toLocaleString('en-US')} ` +
				'pieces of a rocket designed to shed itself stage by stage on the way to the moon. ' +
				'It took me an embarrassingly long time to notice whose rule that was.',
			align: 'left'
		},
		{
			kicker: 'Coda',
			lead: 'The sets were never the thing',
			body: 'being built. My dad knew. He tapped the shelf anyway and let me figure it out.',
			align: 'right'
		}
	];
</script>

<!-- Document-scroll page. The site layout's grid row is minmax(0,1fr)
     inside a min-h-dvh (not fixed-height) grid, so an internal scroll
     container here can't get a stable percentage height — content taller
     than the viewport just grows the row. Instead the document scrolls
     natively (sections are min-h-svh) and the canvas is fixed to the
     viewport behind the prose, which is also what the scene's
     scroll-progress mapping assumes. -->
<main class="relative bg-background text-foreground">
	<!-- Build canvas: fixed full-viewport backdrop. Transparent clear color
	     so the page background (and theme) shows through; pointer-events
	     none so text stays selectable and links clickable through it. -->
	<div class="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
		<canvas bind:this={canvas} class="h-full w-full"></canvas>
	</div>

	<!-- Opening frame: title + premise. Mirrors the register of the other
	     exploration landings so the piece feels native to the site. -->
	<section class="relative z-10 flex min-h-svh items-center px-6 md:px-12 lg:px-20">
		<div class="relative max-w-xl">
			<!-- Soft scrim: a blurred wash of the page background so prose stays
			     readable when bricks drift behind it (and on phones, where the
			     scene isn't offset to the side). Blur keeps it edgeless — no
			     visible card. -->
			<div
				class="absolute -inset-x-8 -inset-y-10 -z-10 rounded-[3rem] bg-background/65 blur-2xl"
				aria-hidden="true"
			></div>
			<p
				class="font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase"
				in:flyIn={{ y: 16, duration: 700, delay: 80, easing: quintOut }}
			>
				Explorations · brick by brick
			</p>
			<h1
				class="mt-6 font-serif text-6xl leading-[0.95] text-foreground italic select-none md:text-7xl lg:text-[5.5rem]"
				in:flyIn={{ y: 24, duration: 700, delay: 180, easing: quintOut }}
			>
				<span class="text-accent">Built</span> to be torn down.
			</h1>
			<p
				class="text-md mt-8 max-w-md leading-relaxed text-muted-foreground select-none md:text-lg"
				in:flyIn={{ y: 20, duration: 700, delay: 320, easing: quintOut }}
			>
				Six memories in plastic — building, breaking, and building again from the same bricks.
				Scroll to read.
			</p>
			<p
				class="mt-10 font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase"
				in:flyIn={{ y: 16, duration: 700, delay: 440, easing: quintOut }}
				aria-hidden="true"
			>
				↓ Scroll
			</p>
		</div>
	</section>

	{#each vignettes as v (v.kicker)}
		<section
			class="relative z-10 flex min-h-svh items-center px-6 md:px-12 lg:px-20 {v.align === 'right'
				? 'md:justify-end'
				: ''}"
		>
			<div class="relative max-w-xl">
				<div
					class="absolute -inset-x-8 -inset-y-10 -z-10 rounded-[3rem] bg-background/65 blur-2xl"
					aria-hidden="true"
				></div>
				<p class="font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
					{v.kicker}
				</p>
				<p
					class="mt-6 font-serif text-3xl leading-[1.15] text-foreground italic md:text-4xl lg:text-5xl"
				>
					<span class="text-accent">{v.lead}</span>
					{v.body}
				</p>
			</div>
		</section>
	{/each}

	<!-- Attribution required by the OMR model's CCAL 2.0 license: the on-
	     screen build is the real 21309 placement data, someone else's work. -->
	<footer class="relative z-10 px-6 pb-8 md:px-12 lg:px-20">
		<p class="font-mono text-[0.65rem] tracking-[0.18em] text-subtle uppercase">
			Set {setData.set.replace(/-1$/, '')} · {setData.credit}
		</p>
	</footer>
</main>
