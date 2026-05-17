<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { pageTransition } from '$lib/transition.svelte';

	// Entrance transitions only fire when this page is reached via the wash
	// navigation from the home page. On a direct load or refresh the content
	// paints in place. Same pattern as /elsewhere so the two destinations
	// behave identically.
	const animate = pageTransition.consumeIntro();
	const noIntro = () => ({ duration: 0 });
	const flyIn = animate ? fly : noIntro;
</script>

<Seo
	title="Explorations"
	description="A collection of work, side projects, and explorations from Sidharth Lakshmanan — coming soon."
/>

<main class="relative h-full min-h-0 overflow-hidden bg-background text-foreground">
	<section class="relative z-10 flex h-full items-center px-6 md:px-12 lg:px-20">
		<div class="relative max-w-xl">
			<p
				class="font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase"
				in:flyIn={{ y: 16, duration: 700, delay: 80, easing: quintOut }}
			>
				Explorations · in progress
			</p>
			<h1
				class="mt-6 font-serif text-6xl leading-[0.95] text-foreground italic select-none md:text-7xl lg:text-[5.5rem]"
				in:flyIn={{ y: 24, duration: 700, delay: 180, easing: quintOut }}
			>
				<span class="text-accent">Coming</span> soon.
			</h1>
			<p
				class="text-md mt-8 max-w-md leading-relaxed text-muted-foreground select-none md:text-lg"
				in:flyIn={{ y: 20, duration: 700, delay: 320, easing: quintOut }}
			>
				A working index of side projects, prototypes, and writing is on the way. In the meantime,
				the freshest signals live <a
					href={resolve('/elsewhere')}
					data-cursor="text"
					class="text-accent transition-colors hover:text-foreground">elsewhere</a
				> — LinkedIn, X, GitHub.
			</p>
		</div>
	</section>
</main>
