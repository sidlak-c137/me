<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Button, useTheme } from '@me/design-system';
	import TopoScene from '$lib/components/TopoScene.svelte';
	import Mail from '@lucide/svelte/icons/mail';

	const theme = useTheme();

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

<main class="relative h-dvh overflow-hidden bg-background text-foreground">
	<!-- Topo-sand surface as a full-bleed background. Fixed so it stays in
	     place under any scrolling content; -z-0 keeps it behind the hero. -->
	<div class="fixed inset-0 z-0" aria-hidden="true">
		<TopoScene />
	</div>

	<!-- Top bar: small label + theme toggle, sitting above the surface. -->
	<header class="relative z-20 flex items-center justify-between px-6 py-5 md:px-10 md:py-6">
		<span class="font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
			SidLak
		</span>
		<Button
			variant="secondary"
			onclick={theme.toggle}
			data-cursor="hover"
			aria-label="Toggle color theme"
		>
			<!-- Label rendered for both themes and CSS-gated by the `.dark`
			     class so SSR and client emit identical markup — sidesteps
			     the hydration mismatch from reading reactive theme state
			     before $effect has run. -->
			<span aria-hidden="true" class="dark:hidden">☾</span>
			<span aria-hidden="true" class="hidden dark:inline">☀</span>
			<span class="dark:hidden">dark</span>
			<span class="hidden dark:inline">light</span>
		</Button>
	</header>

	<!-- Hero copy overlays the topo surface. A soft radial gradient behind
	     the column lifts the type off the lines without hard-edged panels. -->
	<section class="relative z-10 flex h-[calc(100dvh-5rem)] items-center px-6 md:px-12 lg:px-20">
		<div class="relative max-w-xl">
			<div
				class="pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10"
				aria-hidden="true"
			></div>
			{#if mounted}
				<h1
					class="font-serif text-6xl leading-[0.95] italic md:text-7xl lg:text-[5.5rem]"
					in:fly={{ y: 24, duration: 700, delay: 80, easing: quintOut }}
				>
					<span class="text-accent">Sid</span>harth<br /><span class="text-accent">Lak</span>shmanan
				</h1>
				<p
					class="text-md mt-8 max-w-md leading-relaxed text-muted-foreground md:text-lg"
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
					<Button
						variant="secondary"
						class="px-2.5!"
						aria-label="LinkedIn"
						href="https://www.linkedin.com/in/sidharth-lakshmanan"
						target="_blank"
						rel="noopener noreferrer"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="h-4 w-4"
							aria-hidden="true"
						>
							<path
								d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"
							/>
						</svg>
					</Button>
					<Button
						variant="secondary"
						class="px-2.5!"
						aria-label="X"
						href="https://x.com/theSidLak"
						target="_blank"
						rel="noopener noreferrer"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="h-4 w-4"
							aria-hidden="true"
						>
							<path
								d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"
							/>
						</svg>
					</Button>
					<Button
						variant="secondary"
						class="px-2.5!"
						aria-label="GitHub"
						href="https://github.com/sidlak-c137"
						target="_blank"
						rel="noopener noreferrer"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="h-4 w-4"
							aria-hidden="true"
						>
							<path
								d="M12 .5C5.73.5.67 5.56.67 11.83c0 5.02 3.25 9.27 7.76 10.77.57.1.78-.24.78-.54 0-.27-.01-1.16-.02-2.1-3.16.69-3.83-1.34-3.83-1.34-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.14.08 1.74 1.17 1.74 1.17 1.02 1.75 2.67 1.24 3.32.95.1-.74.4-1.24.72-1.53-2.52-.29-5.17-1.26-5.17-5.6 0-1.24.44-2.25 1.17-3.04-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.16.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.47 3.14-1.16 3.14-1.16.63 1.57.23 2.73.12 3.02.73.79 1.16 1.8 1.16 3.04 0 4.35-2.65 5.3-5.18 5.59.41.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.11 0 .3.2.65.79.54 4.51-1.5 7.75-5.75 7.75-10.77C23.33 5.56 18.27.5 12 .5z"
							/>
						</svg>
					</Button>
					<Button
						variant="secondary"
						class="px-2.5!"
						aria-label="Email"
						href="mailto:sidharth.m.lakshmanan@gmail.com"
					>
						<Mail class="h-4 w-4" aria-hidden="true" />
					</Button>
				</div>
			{/if}
		</div>
	</section>
</main>
