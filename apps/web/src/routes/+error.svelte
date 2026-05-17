<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';

	// Per-status copy. 404 reads as "this URL doesn't resolve"; 5xx reads as
	// "something on our end went wrong". Anything outside those buckets
	// (uncommon 4xx like 403/429) gets a neutral fallback so the page never
	// renders with empty strings. Keep the kicker terse — the status code
	// already carries the technical signal.
	type Copy = { kicker: string; headlineLead: string; headlineTail: string; body: string };

	function copyFor(status: number): Copy {
		if (status === 404) {
			return {
				kicker: 'Not found',
				headlineLead: 'Lost',
				headlineTail: 'in the ether.',
				body:
					'This page either moved or was never here. Head back home and pick up the thread from a known address.'
			};
		}
		if (status >= 500) {
			return {
				kicker: 'Server error',
				headlineLead: 'Something',
				headlineTail: 'broke.',
				body:
					'A request didn’t make it through cleanly. Refresh in a moment or head home — the ' +
					'issue is on this end, not yours.'
			};
		}
		if (status >= 400) {
			return {
				kicker: 'Request error',
				headlineLead: 'Off',
				headlineTail: 'course.',
				body:
					'The request couldn’t be handled as-is. Double-check the URL or head back to the ' +
					'index.'
			};
		}
		return {
			kicker: 'Error',
			headlineLead: 'Something',
			headlineTail: 'is off.',
			body: 'An unexpected state was reached. The home page is the safest way back.'
		};
	}

	const status = $derived(page.status ?? 500);
	const c = $derived(copyFor(status));
	// `noindex` so search engines don't surface error responses themselves —
	// crawlers naturally drop 4xx/5xx pages, but the explicit signal removes
	// any chance of an indexed soft-404 from CDN edge caches.
</script>

<Seo
	title={`${status} · ${c.kicker}`}
	description={c.body}
	noindex
/>

<main class="relative h-full min-h-0 overflow-hidden bg-background text-foreground">
	<section class="relative z-10 flex h-full items-center px-6 md:px-12 lg:px-20">
		<div class="relative max-w-xl">
			<p
				class="font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase"
				aria-hidden="true"
			>
				{status} · {c.kicker}
			</p>
			<h1
				class="mt-6 font-serif text-6xl leading-[0.95] text-foreground italic select-none md:text-7xl lg:text-[5.5rem]"
			>
				<span class="text-accent">{c.headlineLead}</span>
				{c.headlineTail}
			</h1>
			<p
				class="text-md mt-8 max-w-md leading-relaxed text-muted-foreground select-none md:text-lg"
			>
				{c.body}
			</p>

			<div class="mt-10 flex flex-wrap items-center gap-3">
				<a
					href={resolve('/')}
					data-cursor="hover"
					class="inline-flex select-none items-center justify-center gap-2 rounded-full border border-foreground bg-foreground px-5 py-2 font-mono text-[0.72rem] tracking-[0.18em] text-background uppercase transition-colors duration-200 hover:bg-foreground/90"
				>
					← Home
				</a>
				<a
					href={resolve('/elsewhere')}
					data-cursor="hover"
					class="inline-flex select-none items-center justify-center gap-2 rounded-full border border-foreground/30 bg-background px-5 py-2 font-mono text-[0.72rem] tracking-[0.18em] text-foreground uppercase transition-colors duration-200"
				>
					Elsewhere
				</a>
			</div>

			{#if page.error?.message && status >= 500}
				<!-- Surface the upstream message only on 5xx — the message on a 404
				     is just "Not Found" and adds nothing for the reader. Renders as
				     small mono caption to match the rest of the metadata. -->
				<p class="mt-10 font-mono text-xs tracking-tight text-subtle">
					{page.error.message}
				</p>
			{/if}
		</div>
	</section>
</main>
