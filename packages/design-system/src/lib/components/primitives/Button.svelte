<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'link';

	// Polymorphic: passing `href` renders an `<a>` so client-side
	// routing, prefetch (data-sveltekit-preload-data), middle-click
	// and right-click all work. Without `href` it renders a `<button>`.
	type Props = HTMLButtonAttributes &
		HTMLAnchorAttributes & {
			variant?: Variant;
			href?: string;
			children?: Snippet;
		};

	let { variant = 'primary', class: cls = '', href, children, ...rest }: Props = $props();

	const isLink = $derived(variant === 'link');

	const base = $derived(
		isLink
			? 'text-accent select-none'
			: 'inline-flex select-none items-center justify-center gap-2 rounded-full border px-5 py-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] transition-colors duration-200'
	);

	const variants: Record<Variant, string> = {
		primary:
			'border-foreground bg-foreground text-background hover:bg-foreground/90 disabled:hover:bg-foreground',
		accent: 'border-accent bg-accent text-accent-foreground hover:bg-accent/90',
		secondary: 'border-foreground/30 bg-background text-foreground',
		ghost: 'border-transparent bg-transparent text-muted-foreground hover:text-foreground',
		link: ''
	};
</script>

{#if href !== undefined}
	<a
		{href}
		{...rest}
		data-cursor={isLink ? 'text' : 'hover'}
		data-cursor-pad="0"
		class="{base} {variants[variant]} {cls}"
	>
		{#if children}{@render children()}{/if}
	</a>
{:else}
	<button
		{...rest}
		data-cursor={isLink ? 'text' : 'hover'}
		data-cursor-pad="0"
		class="{base} {variants[variant]} {cls}"
	>
		{#if children}{@render children()}{/if}
	</button>
{/if}
