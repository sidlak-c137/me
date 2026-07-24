<script lang="ts">
	// Top-down sports car SVG, shared between the wandering TopoScene overlay
	// and the cross-page wash (where it tows the green pane across the screen).
	// The two front wheels are exposed as bindable refs so TopoScene can rotate
	// them each frame to show steering; consumers that don't steer just leave
	// the bindings off. `class` flows onto the <svg> so each surface can pick
	// its own colour/size (e.g. text-accent on the topo, text-accent-foreground
	// against the green pane).
	let {
		class: className = 'text-accent drop-shadow-sm',
		frontLeftWheel = $bindable(),
		frontRightWheel = $bindable()
	}: {
		class?: string;
		frontLeftWheel?: SVGRectElement;
		frontRightWheel?: SVGRectElement;
	} = $props();
</script>

<svg
	width="18"
	height="28"
	viewBox="0 0 18 28"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
>
	<!-- Top-down sports car: tapered nose forward (+Y is rear) -->
	<!-- Wheels (drawn first so the body covers their inner edge).
	     Front wheels get rotated each frame via setAttribute. -->
	<rect
		bind:this={frontLeftWheel}
		x="0.2"
		y="6.5"
		width="2.6"
		height="4.2"
		rx="0.9"
		fill="currentColor"
		opacity="0.9"
	/>
	<rect
		bind:this={frontRightWheel}
		x="15.2"
		y="6.5"
		width="2.6"
		height="4.2"
		rx="0.9"
		fill="currentColor"
		opacity="0.9"
	/>
	<rect x="0.2" y="17.5" width="2.6" height="4.6" rx="0.9" fill="currentColor" opacity="0.9" />
	<rect x="15.2" y="17.5" width="2.6" height="4.6" rx="0.9" fill="currentColor" opacity="0.9" />
	<!-- Body: rounded front, narrowed tail -->
	<path
		d="M4.4 3 Q9 0.6 13.6 3 L15.4 6.3 L15.4 21.5 L13.6 26 L4.4 26 L2.6 21.5 L2.6 6.3 Z"
		fill="currentColor"
		opacity="0.75"
	/>
	<!-- Windshield (trapezoid, darker glass) -->
	<path d="M5.5 8.6 L12.5 8.6 L13.4 12.4 L4.6 12.4 Z" fill="currentColor" opacity="0.4" />
	<!-- Roof + centre racing stripe -->
	<rect x="5" y="12.4" width="8" height="5.4" rx="0.7" fill="currentColor" opacity="0.95" />
	<rect x="8.3" y="12.4" width="1.4" height="5.4" fill="currentColor" opacity="0.55" />
	<!-- Rear window -->
	<path d="M4.6 17.8 L13.4 17.8 L12.5 21.4 L5.5 21.4 Z" fill="currentColor" opacity="0.4" />
	<!-- Rear spoiler -->
	<rect x="3" y="25.8" width="12" height="1.3" rx="0.5" fill="currentColor" opacity="0.95" />
</svg>
