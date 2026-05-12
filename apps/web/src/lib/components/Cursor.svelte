<script lang="ts">
	import { onMount } from 'svelte';

	const SELECTOR =
		'a, button, input, textarea, select, summary, [role="button"], [data-cursor="hover"]';
	const RING_SIZE = 24;
	const DOT_SIZE = 6;
	const FAST_SPEED = 1.8;
	const VELOCITY_DECAY = 0.82;
	const DWELL_MS = 50;

	let dotX = $state(0);
	let dotY = $state(0);
	let ringX = $state(0);
	let ringY = $state(0);

	type Mode = 'free' | 'morph' | 'text';

	let mode = $state<Mode>('free');
	let visible = $state(false);
	let pressed = $state(false);

	onMount(() => {
		if (window.matchMedia('(pointer: coarse)').matches) return;

		let lastX = window.innerWidth / 2;
		let lastY = window.innerHeight / 2;
		let targetDotX = lastX;
		let targetDotY = lastY;
		let velocity = 0;
		let lastMoveTime = 0;

		dotX = ringX = lastX;
		dotY = ringY = lastY;

		let hoverEl: HTMLElement | null = null;
		let pendingEl: HTMLElement | null = null;
		let pendingMode: Mode = 'free';
		let pendingSince = 0;

		// Outline lives inside the hovered element so it tracks scroll/overscroll
		// transforms automatically. The dot and free-mode ring stay in viewport space.
		const outline = document.createElement('div');
		outline.className = 'cursor-outline';
		outline.setAttribute('aria-hidden', 'true');
		outline.dataset.cursor = 'ignore';
		// Replaced/void elements (input, textarea, select, etc.) can't host rendered
		// children. For those we proxy: host the outline on the parent and position
		// it explicitly to overlay the element.
		const PROXY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'VIDEO', 'CANVAS']);
		let prevHost: HTMLElement | null = null;
		let prevPosition: string | null = null;

		const isInteractive = (el: HTMLElement) => {
			if (el.dataset.cursor === 'ignore') return false;
			if ((el as HTMLButtonElement).disabled) return false;
			if (el.getAttribute('aria-disabled') === 'true') return false;
			return true;
		};

		const findInteractive = (x: number, y: number): { el: HTMLElement | null; mode: Mode } => {
			let cur = document.elementFromPoint(x, y) as HTMLElement | null;
			while (cur) {
				const c = cur.dataset?.cursor;
				if (c === 'ignore') return { el: null, mode: 'free' };
				if (c === 'text' && isInteractive(cur)) return { el: cur, mode: 'text' };
				if (cur.matches?.(SELECTOR) && isInteractive(cur)) return { el: cur, mode: 'morph' };
				cur = cur.parentElement;
			}
			return { el: null, mode: 'free' };
		};

		const attachOutline = (el: HTMLElement, m: 'morph' | 'text') => {
			let host: HTMLElement = el;
			let proxy = false;
			if (PROXY_TAGS.has(el.tagName)) {
				const parent = el.parentElement;
				if (!parent) return;
				host = parent;
				proxy = true;
			}
			prevHost = host;

			const hostCs = getComputedStyle(host);
			if (hostCs.position === 'static') {
				prevPosition = host.style.position;
				host.style.position = 'relative';
			} else {
				prevPosition = null;
			}

			// Read border / radius from the visible element itself, not the proxy host.
			const elCs = proxy ? getComputedStyle(el) : hostCs;

			const padOverride = parseFloat(el.dataset.cursorPad ?? '');
			const pad = Number.isFinite(padOverride) ? padOverride : 0;
			outline.style.setProperty('--pad', `${pad}px`);

			// Non-proxy morph anchors to the padding edge via `100%`, so it needs
			// the element's border width to extend out to the border-box edge.
			// Proxy mode uses border-box rects directly, so the offset is unused.
			if (!proxy) {
				const borderW = parseFloat(elCs.borderTopWidth) || 0;
				outline.style.setProperty('--border-w', `${borderW}px`);
			} else {
				outline.style.removeProperty('--border-w');
			}

			const rOverride = el.dataset.cursorRadius;
			let radius: string;
			if (rOverride === 'circle') {
				radius = '9999px';
			} else if (rOverride && rOverride !== 'match') {
				const n = parseFloat(rOverride);
				radius = Number.isFinite(n) ? `${n + pad}px` : elCs.borderRadius;
			} else {
				radius = elCs.borderRadius;
			}
			outline.style.setProperty('--radius', radius);

			const hostRect = host.getBoundingClientRect();
			// Cursor position in host-local coordinates seeds the morph origin.
			outline.style.setProperty('--start-x', `${lastX - hostRect.left}px`);
			outline.style.setProperty('--start-y', `${lastY - hostRect.top}px`);

			if (proxy) {
				// Element's offset within the proxy host, for explicit final positioning.
				const elRect = el.getBoundingClientRect();
				outline.style.setProperty('--target-x', `${elRect.left - hostRect.left}px`);
				outline.style.setProperty('--target-y', `${elRect.top - hostRect.top}px`);
				outline.style.setProperty('--target-w', `${elRect.width}px`);
				outline.style.setProperty('--target-h', `${elRect.height}px`);
				outline.dataset.proxy = '1';
			} else {
				delete outline.dataset.proxy;
			}

			outline.dataset.mode = m;
			host.appendChild(outline);
			requestAnimationFrame(() => outline.classList.add('visible'));
		};

		const detachOutline = () => {
			if (outline.parentElement) outline.parentElement.removeChild(outline);
			outline.classList.remove('visible');
			if (prevHost && prevPosition !== null) prevHost.style.position = prevPosition;
			prevHost = null;
			prevPosition = null;
		};

		const commit = (el: HTMLElement | null, nextMode: Mode) => {
			if (el === hoverEl && nextMode === mode) return;
			if (hoverEl && (mode === 'morph' || mode === 'text')) detachOutline();
			hoverEl = el;
			mode = nextMode;
			if (el && (nextMode === 'morph' || nextMode === 'text')) attachOutline(el, nextMode);
		};

		const recompute = () => {
			const now = performance.now();
			const { el, mode: nextMode } =
				velocity > FAST_SPEED
					? { el: null as HTMLElement | null, mode: 'free' as Mode }
					: findInteractive(lastX, lastY);

			if (el !== pendingEl || nextMode !== pendingMode) {
				pendingEl = el;
				pendingMode = nextMode;
				pendingSince = now;
			}

			if (nextMode === 'free' || now - pendingSince >= DWELL_MS) commit(el, nextMode);
		};

		const onMove = (e: MouseEvent) => {
			visible = true;
			const now = performance.now();
			const dt = lastMoveTime === 0 ? 16 : Math.max(now - lastMoveTime, 1);
			const inst = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt;
			velocity = velocity * 0.5 + inst * 0.5;
			lastMoveTime = now;
			lastX = e.clientX;
			lastY = e.clientY;
			targetDotX = e.clientX;
			targetDotY = e.clientY;
			recompute();
		};
		const onLeave = () => {
			visible = false;
		};
		const onEnter = (e: MouseEvent) => {
			lastX = e.clientX;
			lastY = e.clientY;
			targetDotX = e.clientX;
			targetDotY = e.clientY;
			dotX = ringX = e.clientX;
			dotY = ringY = e.clientY;
			commit(null, 'free');
			visible = true;
			recompute();
		};
		const onDown = (e: MouseEvent) => {
			if (e.button === 0) pressed = true;
		};
		const onUp = (e: MouseEvent) => {
			if (e.button === 0) pressed = false;
		};
		window.addEventListener('mousemove', onMove, { passive: true });
		window.addEventListener('mousedown', onDown);
		window.addEventListener('mouseup', onUp);
		document.addEventListener('mouseleave', onLeave);
		document.addEventListener('mouseenter', onEnter);
		window.addEventListener('scroll', recompute, { passive: true, capture: true });
		window.addEventListener('resize', recompute);

		let raf = 0;
		const tick = () => {
			const wasFast = velocity > FAST_SPEED;
			velocity *= VELOCITY_DECAY;
			const now = performance.now();
			const pendingDue =
				(pendingEl !== hoverEl || pendingMode !== mode) &&
				(pendingMode === 'free' || now - pendingSince >= DWELL_MS);
			if ((wasFast && velocity <= FAST_SPEED) || pendingDue) recompute();

			dotX += (targetDotX - dotX) * 0.55;
			dotY += (targetDotY - dotY) * 0.55;

			if (mode === 'free') {
				ringX += (targetDotX - ringX) * 0.4;
				ringY += (targetDotY - ringY) * 0.4;
				const dx = dotX - ringX;
				const dy = dotY - ringY;
				const dist = Math.hypot(dx, dy);
				const maxDist = RING_SIZE / 2 - DOT_SIZE / 2 - 1;
				if (dist > maxDist && dist > 0) {
					ringX = dotX - (dx / dist) * maxDist;
					ringY = dotY - (dy / dist) * maxDist;
				}
			} else {
				ringX = dotX;
				ringY = dotY;
			}

			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(raf);
			detachOutline();
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mousedown', onDown);
			window.removeEventListener('mouseup', onUp);
			document.removeEventListener('mouseleave', onLeave);
			document.removeEventListener('mouseenter', onEnter);
			window.removeEventListener('scroll', recompute, true);
			window.removeEventListener('resize', recompute);
		};
	});
</script>

<div class="cursor-layer" aria-hidden="true">
	<div
		class="cursor-dot"
		class:visible
		class:pressed={pressed && mode === 'free'}
		class:hovered={mode === 'morph' || mode === 'text'}
		style="transform: translate3d({dotX - DOT_SIZE / 2}px, {dotY - DOT_SIZE / 2}px, 0)"
	></div>
	<div
		class="cursor-ring"
		class:visible={visible && mode === 'free'}
		class:pressed={pressed && mode === 'free'}
		style="transform: translate3d({ringX - RING_SIZE / 2}px, {ringY -
			RING_SIZE / 2}px, 0) scale(var(--ring-press-scale));"
	></div>
</div>

<style>
	@property --ring-press-scale {
		syntax: '<number>';
		inherits: false;
		initial-value: 1;
	}
	.cursor-layer {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 9999;
	}
	.cursor-dot,
	.cursor-ring {
		position: fixed;
		top: 0;
		left: 0;
		opacity: 0;
		will-change: transform;
		transition:
			box-shadow 200ms ease,
			background-color 180ms ease,
			--ring-press-scale 460ms cubic-bezier(0.34, 1.7, 0.5, 1);
	}
	/* Opacity is hard-cut on hover commit so the outline can pick up where the
	   ring was without a washed-out crossfade. Page enter/leave also hard-cuts. */
	.cursor-dot {
		width: 6px;
		height: 6px;
		border-radius: 9999px;
		background: var(--foreground);
	}
	.cursor-dot.hovered {
		background: var(--accent);
	}
	.cursor-ring {
		width: 24px;
		height: 24px;
		border-radius: 9999px;
		box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--foreground) 35%, transparent);
		transform-origin: center;
	}
	.cursor-dot.visible,
	.cursor-ring.visible {
		opacity: 1;
	}
	.cursor-ring.pressed {
		box-shadow: inset 0 0 0 1px var(--accent);
		background: color-mix(in oklch, var(--accent) 18%, transparent);
		--ring-press-scale: 0.88;
	}
	@media (pointer: coarse) {
		.cursor-layer {
			display: none;
		}
	}

	/* Outline rendered inside the hovered element so it inherits scroll
	   and rubber-band overscroll transforms instead of lagging in viewport space.
	   Morph: starts as a 24px circle at the cursor, expands to fill the element.
	   Text:  starts as a 0-width bar at cursor x, expands outward along the baseline. */
	:global(.cursor-outline) {
		position: absolute;
		pointer-events: none;
		opacity: 1;
		z-index: 1;
		/* Snappy ease-out approximating the original JS exponential lerp:
		   ~50% in ~50ms, settling around 220ms. No opacity transition so the
		   swap from free ring is instant. */
		transition:
			left 220ms cubic-bezier(0.16, 1, 0.3, 1),
			top 220ms cubic-bezier(0.16, 1, 0.3, 1),
			width 220ms cubic-bezier(0.16, 1, 0.3, 1),
			height 220ms cubic-bezier(0.16, 1, 0.3, 1),
			border-radius 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	:global(.cursor-outline[data-mode='morph']) {
		left: calc(var(--start-x, 0px) - 12px);
		top: calc(var(--start-y, 0px) - 12px);
		width: 24px;
		height: 24px;
		/* 12px = half of the 24px starting box, so it renders as a circle without
		   the 9999px-clamp cliff that would snap corners near the end of the morph
		   when the target radius (e.g. an input's 6px) is much smaller. */
		border-radius: 12px;
		box-shadow: inset 0 0 0 1px var(--accent);
		background: color-mix(in oklch, var(--accent) 10%, transparent);
	}
	/* Default (non-proxy): outline fills the host element. */
	:global(.cursor-outline[data-mode='morph'].visible) {
		left: calc(-1 * (var(--pad, 0px) + var(--border-w, 0px)));
		top: calc(-1 * (var(--pad, 0px) + var(--border-w, 0px)));
		width: calc(100% + (var(--pad, 0px) + var(--border-w, 0px)) * 2);
		height: calc(100% + (var(--pad, 0px) + var(--border-w, 0px)) * 2);
		border-radius: var(--radius, 0);
	}
	/* Proxy: host is the parent and target-x/y/w/h come from getBoundingClientRect,
	   which is already the border-box — don't add border-w here. */
	:global(.cursor-outline[data-proxy='1'][data-mode='morph'].visible) {
		left: calc(var(--target-x, 0px) - var(--pad, 0px));
		top: calc(var(--target-y, 0px) - var(--pad, 0px));
		width: calc(var(--target-w, 0px) + var(--pad, 0px) * 2);
		height: calc(var(--target-h, 0px) + var(--pad, 0px) * 2);
	}
	:global(.cursor-outline[data-mode='text']) {
		left: var(--start-x, 0px);
		bottom: 0;
		width: 0;
		height: 1px;
		background: var(--accent);
		border-radius: 0;
	}
	:global(.cursor-outline[data-mode='text'].visible) {
		left: 0;
		width: 100%;
	}
	@media (pointer: coarse) {
		:global(.cursor-outline) {
			display: none;
		}
	}
</style>
