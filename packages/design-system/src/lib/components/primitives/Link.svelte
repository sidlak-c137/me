<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	type Props = HTMLAnchorAttributes & {
		children?: Snippet;
	};

	let { class: cls = '', children, ...rest }: Props = $props();
</script>

<a data-cursor="text" {...rest} class="inline-block leading-tight text-accent no-underline {cls}">
	{#if children}{@render children()}{/if}
</a>
