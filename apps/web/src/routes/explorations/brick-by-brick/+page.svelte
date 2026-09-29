<script lang="ts">
	import { BrickByBrick } from '@me/brick-by-brick';
	import Seo from '$lib/components/Seo.svelte';
	import { pageTransition } from '$lib/transition.svelte';

	// Same intro gating as the sibling explorations pages: animate only when
	// arriving via the cross-page wash, paint in place on direct loads.
	const animate = pageTransition.consumeIntro();
</script>

<Seo
	title="Brick by Brick"
	description="Six memories in plastic — building, breaking, and building again from the same bricks. A scroll-driven story by Sidharth Lakshmanan."
/>

<BrickByBrick {animate} />
