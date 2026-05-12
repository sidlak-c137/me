<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = HTMLInputAttributes & {
		value?: string;
	};

	let { class: cls = '', value = $bindable(''), ...rest }: Props = $props();

	const base =
		'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-0 focus:outline-none';
</script>

<input {...rest} bind:value data-cursor="hover" data-cursor-pad="0" class="{base} {cls}" />
