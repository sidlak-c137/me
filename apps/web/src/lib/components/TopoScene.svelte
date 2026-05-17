<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Color as ThreeColor, WebGLRenderer } from 'three';

	// Single-pass topographic surface with a wandering car overlay.
	// The shader computes a height field (procedural terrain peaks +
	// Gaussian cursor crater), carves contour grooves, and lights the
	// result. A small top-down car SVG drives across the terrain on the
	// CPU side, tilting with the slope.
	//
	// `three` is dynamically imported inside onMount so the ~150KB WebGL
	// dependency stays out of the initial bundle and loads after first
	// paint. Type-only imports above are erased at build time.

	let host: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let carEl: HTMLDivElement;
	let frontLeftWheel: SVGRectElement;
	let frontRightWheel: SVGRectElement;
	let renderer: WebGLRenderer | null = null;
	let raf = 0;
	let ro: ResizeObserver | null = null;

	// ── JS terrain (mirrors the GLSL terrain function exactly) ────────
	// Peaks and tilt are randomised per-mount (i.e. on refresh) and
	// shared with the shader via uniforms so JS car physics and GPU
	// rendering agree on the height field. Fixed slot count matches
	// the static loop bounds in the fragment shader; unused slots
	// are filled with inert peaks (height 0, far off-screen).
	const NUM_PEAKS = 10;
	let PEAKS: [number, number, number, number][] = [];
	// Global linear tilt added to the height field. Its two components
	// must both be non-zero so contour lines far from peaks (where the
	// tilt dominates) cross every edge at an oblique angle — a contour
	// perpendicular to an edge would trap the car against the boundary
	// push-back.
	let TILT: [number, number] = [0, 0];

	// Lay out peaks via Poisson-disk sampling with parameters auto-
	// derived from the actual viewport. The visible region is
	// x ∈ [-aspect/2, aspect/2], y ∈ [-0.5, 0.5], so a wide screen
	// has more horizontal area to fill; without this scaling, the
	// terrain would feel cramped on tall viewports and empty on wide
	// ones. All knobs collapse onto a single density target — every
	// other parameter follows from it via dimensional analysis.
	function generateTerrainParams(aspect: number) {
		// Inner box: leave a margin so peak flanks don't get clipped
		// at the visible edge and FBM detail dominates near borders.
		const marginX = 0.13;
		const marginY = 0.13;
		const bx = Math.max(0.22, aspect / 2 - marginX);
		const by = 0.5 - marginY;
		const area = 2 * bx * (2 * by);

		// Target ~8 peaks per unit² of inner area — matches the curated
		// original (7 peaks in a 0.88 unit² box) and keeps peak density
		// constant across aspects. Capped at NUM_PEAKS so very wide
		// viewports don't overflow the uniform array.
		const targetCount = Math.min(NUM_PEAKS, Math.max(4, Math.round(area * 8)));

		// Min centre-to-centre distance derived from area/count under
		// the assumption each peak claims a square cell. The 0.85
		// shrink leaves enough slack for the sampler to actually fit
		// `targetCount` peaks (pure-square packing has 0 slack).
		const minDist = Math.sqrt(area / targetCount) * 0.85;
		const minDist2 = minDist * minDist;

		// Per-peak max-slope budget. A Gaussian H·exp(-d²/w²) has
		// max gradient 0.858·H/w at d = w/√2, so capping H/w bounds
		// the steepest slope a single peak can contribute. With
		// PEAK_SLOPE = 3.0 the band-spacing in screen pixels from a
		// peak alone is at least 0.05·px_per_unit/3.0 ≈ 16 px on a
		// 1000-px-per-unit viewport — comfortably above the visual
		// crowding threshold even when ridge + FBM contributions
		// stack at the same fragment.
		const PEAK_SLOPE = 3.0;
		const SLOPE_K = 0.858; // exp(-1/2) · √2 ≈ peak-slope coefficient

		const peaks: [number, number, number, number][] = [];
		for (let attempt = 0; attempt < 3000 && peaks.length < targetCount; attempt++) {
			const x = (Math.random() * 2 - 1) * bx;
			const y = (Math.random() * 2 - 1) * by;
			let ok = true;
			for (const [px, py] of peaks) {
				if ((px - x) ** 2 + (py - y) ** 2 < minDist2) {
					ok = false;
					break;
				}
			}
			if (!ok) continue;
			// Sample width first, then derive the height ceiling so
			// the slope budget is honoured by construction. Narrow
			// peaks get capped to lower heights; wider peaks get the
			// full [0.50, 0.85] range. No rejection sampling needed.
			const w = minDist * (0.7 + Math.random() * 0.18);
			const hMax = Math.min(0.85, (w * PEAK_SLOPE) / SLOPE_K);
			const hMin = Math.min(0.5, hMax);
			const h = hMin + Math.random() * Math.max(0, hMax - hMin);
			peaks.push([x, y, h, w]);
		}
		// Fill remaining slots with inert peaks: height 0 contributes
		// nothing to the Gaussian sum, and a position far off-screen
		// keeps the ridgeline `segLen > 0.75` guard from connecting
		// them to any real peak.
		while (peaks.length < NUM_PEAKS) {
			peaks.push([10, 10, 0, 0.3]);
		}
		PEAKS = peaks;

		// Tilt: |tx|,|ty| bounded away from zero so asymptotic contour
		// direction (perpendicular to (tx,ty)) is never aligned with a
		// screen-edge normal — keeps the car off boundary corner cases.
		const tx = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.1);
		const ty = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.1);
		TILT = [tx, ty];
	}

	/** Mirrors the GLSL hash exactly: fract(x) = x - floor(x) */
	function fract(x: number): number {
		return x - Math.floor(x);
	}

	function jsHash(px: number, py: number): number {
		// p = fract(p * vec2(123.34, 456.21))
		let x = fract(px * 123.34);
		let y = fract(py * 456.21);
		// p += dot(p, p + 45.32)  — dot is scalar, added to both x and y
		const d = x * (x + 45.32) + y * (y + 45.32);
		x += d;
		y += d;
		// return fract(p.x * p.y)
		return fract(x * y);
	}

	function jsNoise(px: number, py: number): number {
		const ix = Math.floor(px),
			iy = Math.floor(py);
		const fx = px - ix,
			fy = py - iy;
		const a = jsHash(ix, iy);
		const b = jsHash(ix + 1, iy);
		const c = jsHash(ix, iy + 1);
		const d = jsHash(ix + 1, iy + 1);
		const ux = fx * fx * (3 - 2 * fx);
		const uy = fy * fy * (3 - 2 * fy);
		return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
	}

	function jsFbm(px: number, py: number): number {
		let v = 0,
			a = 0.5;
		for (let i = 0; i < 5; i++) {
			v += a * jsNoise(px, py);
			px *= 2.07;
			py *= 2.07;
			a *= 0.5;
		}
		return v;
	}

	function jsTerrain(px: number, py: number): number {
		// Global tilt — mirrors `dot(uTilt, p)` in the shader.
		let h = TILT[0] * px + TILT[1] * py;
		// Gaussian peaks
		for (const [cx, cy, pH, pW] of PEAKS) {
			const dx = px - cx,
				dy = py - cy;
			h += pH * Math.exp(-(dx * dx + dy * dy) / (pW * pW));
		}
		// Ridgelines between nearby peaks
		for (let i = 0; i < PEAKS.length; i++) {
			for (let j = i + 1; j < PEAKS.length; j++) {
				const [ax, ay, aH] = PEAKS[i];
				const [bx, by, bH] = PEAKS[j];
				if (aH <= 0 || bH <= 0) continue;
				const abx = bx - ax,
					aby = by - ay;
				const segLen = Math.sqrt(abx * abx + aby * aby);
				if (segLen < 1e-6 || segLen > 0.75) continue;
				const dot = (px - ax) * abx + (py - ay) * aby;
				const t = Math.max(0, Math.min(1, dot / (abx * abx + aby * aby)));
				const cx = ax + t * abx,
					cy = ay + t * aby;
				const dR = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
				// Ridge height/width chosen so max ridge slope
				// 0.858·ridgeH/ridgeW stays ≤ ~1.6, keeping ridges
				// from co-stacking with a nearby peak's flank into a
				// contour-packing hot spot.
				const ridgeH = Math.min(aH, bH) * 0.22;
				const ridgeW = 0.1 + segLen * 0.05;
				h += ridgeH * Math.exp(-(dR * dR) / (ridgeW * ridgeW));
			}
		}
		// FBM detail
		h += (jsFbm(px * 3.5 + 7.3, py * 3.5 + 2.1) - 0.5) * 0.18;
		// Domain-warped undulation
		const wX = jsFbm(px * 2 + 1.7, py * 2 + 8.3);
		const wY = jsFbm(px * 2 + 6.1, py * 2 + 0.4);
		h += (jsFbm((px + wX * 0.08) * 4, (py + wY * 0.08) * 4) - 0.5) * 0.08;
		return h;
	}

	/** Full height including cursor crater, so the car reacts to the cursor */
	function jsTerrainWithCursor(
		px: number,
		py: number,
		cx: number,
		cy: number,
		cursorActive: number
	): number {
		let h = jsTerrain(px, py);
		if (cursorActive <= 0 || !Number.isFinite(cx) || !Number.isFinite(cy)) return h;
		// Same Gaussian crater as the shader
		const dx = px - cx,
			dy = py - cy;
		const dC = Math.sqrt(dx * dx + dy * dy);
		const r = dC / 0.075;
		h += -Math.exp(-(r * r)) * 0.55 * cursorActive;
		return h;
	}

	/** Returns [dh/dx, dh/dy] via central differences, including cursor */
	function terrainGradient(
		px: number,
		py: number,
		cx: number,
		cy: number,
		cursorActive: number
	): [number, number] {
		const e = 0.002;
		const gx =
			(jsTerrainWithCursor(px + e, py, cx, cy, cursorActive) -
				jsTerrainWithCursor(px - e, py, cx, cy, cursorActive)) /
			(2 * e);
		const gy =
			(jsTerrainWithCursor(px, py + e, cx, cy, cursorActive) -
				jsTerrainWithCursor(px, py - e, cx, cy, cursorActive)) /
			(2 * e);
		return [gx, gy];
	}

	function safeAspectFromRect(rect: DOMRect | undefined, fallback = 1.5): number {
		const aspect = rect && rect.height > 0 ? rect.width / rect.height : fallback;
		return Number.isFinite(aspect) && aspect > 0 ? aspect : fallback;
	}

	function clamp01(value: number): number {
		return Math.max(0, Math.min(1, value));
	}

	function smoothstepNumber(edge0: number, edge1: number, value: number): number {
		const t = clamp01((value - edge0) / (edge1 - edge0));
		return t * t * (3 - 2 * t);
	}

	function easeOutCubic(value: number): number {
		const t = clamp01(value);
		return 1 - (1 - t) ** 3;
	}

	const VERTEX_SHADER = /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position.xy, 0.0, 1.0);
		}
	`;

	const FRAGMENT_SHADER = /* glsl */ `
		precision highp float;
		varying vec2 vUv;
		uniform vec2 uCursor;
		uniform float uCursorActive;
		uniform vec2 uResolution;
		// Four-stop palette pulled from the design system's paper scale.
		// uBase is the body of the terrain, uDeep / uLight are the
		// shadow / highlight walls of the sharp contour-line emboss,
		// and uPeakTint is the broad hill-body shadow on slopes facing
		// away from the light. uPeakStrength splits the shadow signal
		// between the line model and the hill model: at 0 the broad
		// shadow stays inside uDeep (matching dark mode's existing
		// hillshade), at 1 it pulls out into uPeakTint so the contour
		// emboss can stay subtle enough for text to read over while
		// the hill body still carries real topographic depth.
		uniform vec3 uBase;
		uniform vec3 uDeep;
		uniform vec3 uLight;
		uniform vec3 uPeakTint;
		uniform float uPeakStrength;
		uniform float uIntroProgress;
		uniform float uIntroStartHeight;
		// Per-mount terrain parameters. uPeaks.xy = centre, .z = height,
		// .w = width. uTilt is a global linear gradient added to the
		// height field; both components are bounded away from zero so
		// contour lines never run perpendicular to a screen edge.
		// Unused slots are inert (z = 0, position far off-screen).
		uniform vec4 uPeaks[10];
		uniform vec2 uTilt;

		float hash(vec2 p) {
			p = fract(p * vec2(123.34, 456.21));
			p += dot(p, p + 45.32);
			return fract(p.x * p.y);
		}
		float noise(vec2 p) {
			vec2 i = floor(p); vec2 f = fract(p);
			float a = hash(i);
			float b = hash(i + vec2(1.0, 0.0));
			float c = hash(i + vec2(0.0, 1.0));
			float d = hash(i + vec2(1.0, 1.0));
			vec2 u = f * f * (3.0 - 2.0 * f);
			return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
		}
		float fbm(vec2 p) {
			float v = 0.0;
			float a = 0.5;
			for (int i = 0; i < 5; i++) {
				v += a * noise(p);
				p *= 2.07;
				a *= 0.5;
			}
			return v;
		}
		float easeOutCubic(float x) {
			x = clamp(x, 0.0, 1.0);
			return 1.0 - pow(1.0 - x, 3.0);
		}

		// Generate a realistic terrain with distinct peaks, ridges, and valleys.
		// Peak positions/heights/widths and the global tilt come in as
		// uniforms (randomised per-mount on the JS side), with soft
		// ridgelines connecting nearby peaks, then layers gentle FBM
		// detail on top so the contour lines read as a real topo map.
		float terrain(vec2 p) {
			// Global linear tilt — keeps far-field contour direction off
			// every screen-edge normal.
			float h = dot(uTilt, p);

			// Sum Gaussian peaks
			for (int i = 0; i < 10; i++) {
				vec4 pk = uPeaks[i];
				float d = length(p - pk.xy);
				h += pk.z * exp(-d * d / (pk.w * pk.w));
			}

			// Soft ridgelines between nearby peaks: for each pair, add
			// a gentle raised band along the segment connecting them.
			for (int i = 0; i < 10; i++) {
				for (int j = 0; j < 10; j++) {
					if (j <= i) continue;
					if (uPeaks[i].z <= 0.0 || uPeaks[j].z <= 0.0) continue;
					vec2 a = uPeaks[i].xy; vec2 b = uPeaks[j].xy;
					float segLen = length(b - a);
					if (segLen < 0.000001 || segLen > 0.75) continue; // only connect nearby peaks
					vec2 ab = b - a;
					float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
					vec2 closest = a + t * ab;
					float dRidge = length(p - closest);
					float ridgeH = min(uPeaks[i].z, uPeaks[j].z) * 0.22;
					float ridgeW = 0.10 + segLen * 0.05;
					h += ridgeH * exp(-dRidge * dRidge / (ridgeW * ridgeW));
				}
			}

			// Gentle FBM detail so contours aren't perfectly circular.
			// Low amplitude preserves the large-scale peak structure.
			float detail = fbm(p * 3.5 + vec2(7.3, 2.1)) - 0.5;
			h += detail * 0.18;

			// Slight domain-warped undulation for natural asymmetry
			float warpX = fbm(p * 2.0 + vec2(1.7, 8.3));
			float warpY = fbm(p * 2.0 + vec2(6.1, 0.4));
			h += (fbm((p + vec2(warpX, warpY) * 0.08) * 4.0) - 0.5) * 0.08;

			return h;
		}

		void main() {
			vec2 uv = vUv;
			float aspect = uResolution.x / uResolution.y;
			vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

			// Procedural terrain with distinct peaks, ridges, and valleys.
			// During mount, a descending height floor reveals the terrain from
			// the peaks downward: summit detail is visible first, then each
			// lower contour level drops into place before the final map takes over.
			float fullH = terrain(p);
			float intro = easeOutCubic(uIntroProgress);
			float revealFloor = mix(uIntroStartHeight, -1.25, intro);
			float cappedH = max(fullH, revealFloor);
			float h = mix(cappedH, fullH, smoothstep(0.96, 1.0, uIntroProgress));

			// Cursor crater: Gaussian dent at the pointer. Depth chosen so
			// ~5 concentric bands rasterise as rings around the cursor. This
			// stays independent from the terrain intro so the custom cursor
			// feedback is immediate on page load.
			vec2 cp = (uCursor - 0.5) * vec2(aspect, 1.0);
			float dC = length(p - cp);
			float crater = -exp(-pow(dC / 0.075, 2.0)) * 0.55 * uCursorActive;
			h += crater;

			// Embossed contour grooves. The groove profile is computed
			// per-fragment, but normals are derived analytically from
			// the smooth terrain gradient — avoiding the stair-stepped
			// finite differences that dFdx/dFdy produce across the
			// sharp carved edges. Band density (20 lines per unit of
			// h) is paired with the JS-side peak generator's slope
			// budget so line spacing in screen pixels stays clean by
			// construction — no per-fragment density fades needed.
			float bands = 20.0;
			float c = h * bands;
			float fc = fract(c);
			float d = abs(fc - 0.5);                  // 0 at contour, 0.5 between
			float w = max(fwidth(c), 1e-4);
			float halfWidth = w * 3.5;
			float t = clamp(1.0 - d / halfWidth, 0.0, 1.0);
			// Smooth rounded profile: cubic ease for the U-channel shape
			float profile = t * t * (3.0 - 2.0 * t);
			float grooveDepth = 0.055;

			// Analytical normals: dFdx/dFdy of the *smooth* terrain
			// height give clean derivatives; the groove's normal
			// perturbation is computed via chain rule so no GPU finite
			// differences cross the sharp groove walls.
			float hx = dFdx(h);
			float hy = dFdy(h);
			// d(profile)/dd · dd/d(fc) · d(fc)/dh · bands
			// = 6t(1-t) · (−1/halfWidth) · sign(fc−0.5) · bands
			// At contour centres t=1 → t(1−t)=0 so the sign()
			// discontinuity is always multiplied away to zero.
			float grooveFactor = grooveDepth * 6.0 * t * (1.0 - t)
				* bands * sign(fc - 0.5) / halfWidth;
			float nx = hx * (1.0 + grooveFactor);
			float ny = hy * (1.0 + grooveFactor);
			// Two normals from the same gradient: n is the groove-
			// perturbed normal driving the sharp contour-line emboss;
			// n_body is the un-grooved terrain normal driving a broad
			// hillshade on the hill body. Keeping them separate lets
			// the line emboss (uDeep / uLight) and the broad shadow
			// (uPeakTint) carry independent colours so the line
			// emboss can stay subtle while the body still feels hilly.
			vec3 n      = normalize(vec3(-nx * 110.0, -ny * 110.0, 1.0));
			vec3 n_body = normalize(vec3(-hx * 110.0, -hy * 110.0, 1.0));
			vec3 L = normalize(vec3(-0.5, 0.65, 0.7));
			// Signed shade about a flat-ground baseline. The 0.65
			// offset is the typical diff for un-grooved terrain so
			// the body of the topo stays near uBase; the 2.5 contrast
			// pushes walls toward uDeep / uLight / uPeakTint without
			// crushing tone between bands.
			float diff      = dot(n,      L);
			float diff_body = dot(n_body, L);
			float shade     = clamp((diff      - 0.65) * 2.5, -1.0, 1.0);
			float shadeBody = clamp((diff_body - 0.65) * 2.5, -1.0, 1.0);
			vec3 col = uBase;
			// Broad hill-body shadow first (so the line emboss layers
			// on top of it). At uPeakStrength = 0 this contributes
			// nothing and dark mode behaves exactly as before.
			col = mix(col, uPeakTint, max(-shadeBody, 0.0) * uPeakStrength);
			// Contour-line emboss. shadeContour = shade in dark mode
			// (full combined hillshade goes through uDeep / uLight,
			// preserving the existing look) and the groove-only
			// residual shade - shadeBody in light mode (broad shadow
			// already accounted for by uPeakTint above, so uDeep
			// handles just the narrow line walls).
			float shadeContour = mix(shade, shade - shadeBody, uPeakStrength);
			col = mix(col, uDeep,  max(-shadeContour, 0.0));
			col = mix(col, uLight, max( shadeContour, 0.0));

			// sRGB encode before write. THREE.ColorManagement (on by
			// default) stores Color uniforms in linear-sRGB, and the
			// renderer's outputColorSpace = SRGBColorSpace expects the
			// framebuffer to be sRGB-encoded. Built-in materials get this
			// chunk auto-injected; ShaderMaterial does not — without it,
			// linear values land in an sRGB buffer and the hue shifts
			// (warm cream reads olive on the highlight side, magenta on
			// the shadow side) because the per-channel mid-tone gamma
			// distortion isn't uniform across R/G/B once they diverge.
			vec3 outCol = mix(
				12.92 * col,
				1.055 * pow(max(col, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
				step(vec3(0.0031308), col)
			);

			gl_FragColor = vec4(outCol, 1.0);
		}
	`;

	onMount(() => {
		// `three` is heavy (~150KB gz) and only runs on the client, so we
		// dynamic-import it after mount. The synchronous return below
		// preserves the cleanup contract Svelte expects from onMount; the
		// `cancelled` flag handles the case where the component is torn
		// down before the module resolves.
		let cancelled = false;
		let cleanup: (() => void) | undefined;

		(async () => {
			const THREE = await import('three');
			if (cancelled) return;

			// Coarse-pointer (touch) devices: no hover means the cursor
			// crater never activates, so skip registering the global
			// pointer listeners. Mirrors Cursor.svelte's detection.
			const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

			renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
			renderer.setClearColor(0x000000, 0);

			const scene = new THREE.Scene();
			const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
			const quad = new THREE.PlaneGeometry(2, 2);

			// Generate the per-mount terrain with the actual viewport aspect
			// so peak placement scales with the visible area. Done here
			// rather than at module scope because host's dimensions are only
			// known once the component is mounted.
			const initialRect = host.getBoundingClientRect();
			// Real (unclamped) aspect drives car-position scaling below; the
			// floor-clamped variant is only used for peak placement so very
			// tall viewports still get a reasonable number of peaks.
			const initialActualAspect = safeAspectFromRect(initialRect, 1.5);
			const initialAspect = Math.max(0.5, initialActualAspect);
			generateTerrainParams(initialAspect);
			const introPeakHeight = PEAKS.reduce((maxH, [x, y, pH]) => {
				return pH > 0 ? Math.max(maxH, jsTerrain(x, y)) : maxH;
			}, 0.5);
			const introStartHeight = Math.max(0.35, introPeakHeight - 0.18);

			const uniforms = {
				uCursor: { value: new THREE.Vector2(0.5, 0.5) },
				uCursorActive: { value: 0 },
				uResolution: { value: new THREE.Vector2(1, 1) },
				// Overwritten immediately by readColors(); light-mode fallbacks
				// are fine because the first frame hasn't painted yet.
				uBase: { value: new THREE.Color('#fdfcf6') },
				uDeep: { value: new THREE.Color('#dcd5b8') },
				uLight: { value: new THREE.Color('#fdfcf6') },
				uPeakTint: { value: new THREE.Color('#bcae84') },
				uPeakStrength: { value: 0.0 },
				uIntroProgress: { value: 0.0 },
				uIntroStartHeight: { value: introStartHeight },
				// Per-mount terrain: peaks packed as (x, y, height, width).
				// The array length must match the shader's `vec4 uPeaks[10]`.
				uPeaks: {
					value: PEAKS.map((p) => new THREE.Vector4(p[0], p[1], p[2], p[3]))
				},
				uTilt: { value: new THREE.Vector2(TILT[0], TILT[1]) }
			};

			const material = new THREE.ShaderMaterial({
				uniforms,
				vertexShader: VERTEX_SHADER,
				fragmentShader: FRAGMENT_SHADER
			});
			scene.add(new THREE.Mesh(quad, material));

			let cursorTargetX = 0.5;
			let cursorTargetY = 0.5;
			let cursorX = 0.5;
			let cursorY = 0.5;

			const onMove = (e: PointerEvent) => {
				const r = host.getBoundingClientRect();
				if (r.width <= 0 || r.height <= 0) return;
				cursorTargetX = clamp01((e.clientX - r.left) / r.width);
				// UV origin is bottom-left in GL; flip Y to match pointer space.
				cursorTargetY = clamp01(1.0 - (e.clientY - r.top) / r.height);
				uniforms.uCursorActive.value = 1;
			};
			const onLeave = () => {
				uniforms.uCursorActive.value = 0;
			};
			if (!coarsePointer) {
				window.addEventListener('pointermove', onMove, { passive: true });
				window.addEventListener('pointerleave', onLeave);
			}

			function resize() {
				if (!renderer || !host) return;
				const r = host.getBoundingClientRect();
				const w = Math.max(1, r.width);
				const h = Math.max(1, r.height);
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				renderer.setPixelRatio(dpr);
				renderer.setSize(w, h, false);
				uniforms.uResolution.value.set(w * dpr, h * dpr);
			}

			// Resolve a CSS custom property into a THREE.Color. The design
			// system tokens use oklch(), which neither THREE.Color nor 2D
			// canvas fillStyle can parse as a *string*. But a 2D canvas can
			// *rasterise* any CSS colour the browser supports — so we:
			//   1. Read the raw property value from :root / .dark.
			//   2. Paint a 1×1 pixel with it on an offscreen canvas.
			//   3. Read the pixel back as sRGB bytes via getImageData.
			//   4. Feed it to THREE.Color.setRGB in SRGBColorSpace so
			//      ColorManagement converts it to linear for the shader.
			const normCanvas = document.createElement('canvas');
			normCanvas.width = 1;
			normCanvas.height = 1;
			const normCtx = normCanvas.getContext('2d')!;
			function applyCssString(target: ThreeColor, value: string, fb: string) {
				if (!value) {
					target.set(fb);
					return;
				}
				normCtx.clearRect(0, 0, 1, 1);
				normCtx.fillStyle = value;
				normCtx.fillRect(0, 0, 1, 1);
				const px = normCtx.getImageData(0, 0, 1, 1).data;
				if (px[3] === 0) {
					target.set(fb);
					return;
				}
				// setRGB with SRGBColorSpace tells THREE the values are
				// gamma-encoded; it will linearise them internally so the
				// shader's manual linear→sRGB encode produces correct output.
				target.setRGB(px[0] / 255, px[1] / 255, px[2] / 255, THREE.SRGBColorSpace);
			}
			function cssColorApply(target: ThreeColor, name: string, fb: string) {
				const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
				applyCssString(target, v, fb);
			}
			// Mix two CSS custom properties in oklch (the space the paper
			// tokens are authored in), so t=0.5 lands on a true perceptual
			// midpoint rather than a linear-RGB average.
			function cssColorMixApply(target: ThreeColor, a: string, b: string, t: number, fb: string) {
				const root = getComputedStyle(document.documentElement);
				const va = root.getPropertyValue(a).trim();
				const vb = root.getPropertyValue(b).trim();
				if (!va || !vb) {
					target.set(fb);
					return;
				}
				const wb = Math.round(t * 10000) / 100;
				applyCssString(target, `color-mix(in oklch, ${va}, ${vb} ${wb}%)`, fb);
			}
			function readColors() {
				const isDark = document.documentElement.classList.contains('dark');
				if (isDark) {
					cssColorApply(uniforms.uBase.value, '--background', '#332e26');
					cssColorApply(uniforms.uDeep.value, '--color-paper-950', '#1e1a14');
					cssColorApply(uniforms.uLight.value, '--color-paper-700', '#5b554b');
					uniforms.uPeakStrength.value = 0.0;
				} else {
					cssColorApply(uniforms.uBase.value, '--color-background', '#fdfcf6');
					cssColorMixApply(
						uniforms.uDeep.value,
						'--color-paper-100',
						'--color-paper-200',
						0.85,
						'#000000'
					);
					cssColorApply(uniforms.uLight.value, '--surface', '#ffffff');
					cssColorMixApply(
						uniforms.uPeakTint.value,
						'--color-paper-300',
						'--color-paper-400',
						0.5,
						'#c5b692'
					);
					uniforms.uPeakStrength.value = 1.0;
				}
			}
			readColors();
			const themeObs = new MutationObserver(readColors);
			themeObs.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class']
			});

			// ── Car state ─────────────────────────────────────────────
			// The car has real velocity + momentum. The contour direction
			// acts as a steering force, and gravity pulls downhill. Drag
			// bleeds speed so it doesn't accelerate forever. The result:
			// the car hugs contour lines loosely, carries momentum through
			// curves, and can be launched off a contour when the cursor
			// crater suddenly reshapes the terrain beneath it.
			//
			// Start position is scaled to the actual viewport aspect: the
			// visible x range is [-aspect/2, aspect/2], so a hardcoded -0.20
			// either falls outside or lands inside the edge-push margin on
			// narrow (portrait-phone) viewports. When that happens the car
			// is hard-clamped to the boundary and the very first movement
			// step can look stuck. Keep the start comfortably inside the
			// current edge, falling back to centre on extremely narrow panes.
			const startEdgeX = initialActualAspect * 0.5;
			let carPx = -Math.min(0.2, Math.max(0, startEdgeX - 0.1));
			let carPy = 0.15;
			let previousAspect = initialActualAspect;
			let carHeading = 0; // smoothed visual heading
			const minSpeed = 0.04; // speed on tight turns
			const maxSpeed = 0.18; // speed on straights
			// Seed the smoothed direction from the terrain gradient at the
			// car's start position so it moves at full speed once the intro
			// releases it.
			// Without this, smoothDx/smoothDy ramp up from 0 and the car
			// drifts into an edge before reaching cruising speed — on smaller
			// windows the world-space is narrow enough that this looks like
			// the car never starts.
			const [initGx, initGy] = terrainGradient(carPx, carPy, 0, 0, 0);
			const initGradLen = Math.sqrt(initGx * initGx + initGy * initGy);
			let smoothDx = initGradLen > 1e-6 ? -initGy / initGradLen : 1;
			let smoothDy = initGradLen > 1e-6 ? initGx / initGradLen : 0;
			let prevNx = 0,
				prevNy = 0; // previous frame's normalized direction
			let smoothTurnRate = 0; // smoothed turn rate for speed control
			let smoothSpeed = minSpeed; // smoothed actual speed
			let steerAngle = 0; // smoothed front-wheel steer (SVG degrees)
			let lastTime = 0;
			let introStart = 0;
			const terrainIntroMs = 2200;
			const carPlaceStartMs = terrainIntroMs * 0.28;
			const carPlaceMs = 520;

			function tick(now: number) {
				raf = requestAnimationFrame(tick);

				const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
				lastTime = now;
				if (!introStart) introStart = now;
				const introElapsed = now - introStart;
				const terrainIntro = clamp01(introElapsed / terrainIntroMs);
				const carPlace = smoothstepNumber(
					carPlaceStartMs,
					carPlaceStartMs + carPlaceMs,
					introElapsed
				);
				const carCanDrive = carPlace >= 0.92;
				uniforms.uIntroProgress.value = terrainIntro;

				// Cursor smoothing
				cursorX += (cursorTargetX - cursorX) * 0.18;
				cursorY += (cursorTargetY - cursorY) * 0.18;
				uniforms.uCursor.value.set(cursorX, cursorY);

				// ── Update car ──────────────────────────────────────
				const rect = host?.getBoundingClientRect();
				const aspect = safeAspectFromRect(rect, previousAspect);
				if (Math.abs(aspect - previousAspect) > 1e-4) {
					const screenU = carPx / previousAspect + 0.5;
					carPx = (screenU - 0.5) * aspect;
					previousAspect = aspect;
				}
				// Screen-edge half-extents used for boundary avoidance and
				// hard-clamp below. Declared early so the avoidance force
				// can be folded into the raw contour direction.
				const edgeX = aspect * 0.5;
				const edgeY = 0.5;

				if (carCanDrive) {
					const cursorWorldX = (cursorX - 0.5) * aspect;
					const cursorWorldY = cursorY - 0.5;
					const cActive = uniforms.uCursorActive.value;

					// Gradient of terrain+cursor at car position
					const [gx, gy] = terrainGradient(carPx, carPy, cursorWorldX, cursorWorldY, cActive);
					const gradLen = Math.sqrt(gx * gx + gy * gy);

					if (Number.isFinite(gradLen) && gradLen > 1e-6) {
						// Raw contour direction (perpendicular to gradient, CCW)
						let rawDx = -gy / gradLen;
						let rawDy = gx / gradLen;

						// Boundary avoidance — blended into the raw direction
						// *before* smoothing so the smoother cooperates with the
						// redirect instead of fighting it. The old approach pushed
						// smoothDx/smoothDy *after* movement; the next frame's
						// exponential smooth then pulled the direction right back
						// toward the contour, trapping the car at edges. Scale
						// margin to viewport so it never eats more than ~15 % of
						// the half-extent on narrow windows.
						const avoidMargin = Math.max(0.02, Math.min(0.06, edgeX * 0.15, edgeY * 0.15));
						const avoidStr = 3.0;
						const oR = carPx - (edgeX - avoidMargin);
						const oL = -carPx - (edgeX - avoidMargin);
						const oT = carPy - (edgeY - avoidMargin);
						const oB = -carPy - (edgeY - avoidMargin);
						if (oR > 0) rawDx -= avoidStr * (oR / avoidMargin);
						if (oL > 0) rawDx += avoidStr * (oL / avoidMargin);
						if (oT > 0) rawDy -= avoidStr * (oT / avoidMargin);
						if (oB > 0) rawDy += avoidStr * (oB / avoidMargin);
						const rawLen = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
						if (rawLen > 1e-6) {
							rawDx /= rawLen;
							rawDy /= rawLen;
						}

						// Smooth the direction over time
						const ease = 1 - Math.exp(-dt * 3.5);
						smoothDx += (rawDx - smoothDx) * ease;
						smoothDy += (rawDy - smoothDy) * ease;
					} else if (smoothDx === 0 && smoothDy === 0) {
						// If a resize or transient bad cursor value leaves the terrain
						// sample unusable, seed the global-tilt contour direction so
						// motion never stalls or degenerates into a horizontal drift.
						smoothDx = -TILT[1];
						smoothDy = TILT[0];
					}

					// Normalize smoothed direction
					const sLen = Math.sqrt(smoothDx * smoothDx + smoothDy * smoothDy);
					if (sLen > 1e-6) {
						const nx = smoothDx / sLen;
						const ny = smoothDy / sLen;

						// Turn amount: how much the direction changed since last frame.
						// Cross product magnitude ≈ sin(angle between frames).
						// Divide by distance travelled (speed * dt) to get curvature
						// (angle per unit distance) — independent of frame rate.
						if (prevNx !== 0 || prevNy !== 0) {
							const crossSigned = prevNx * ny - prevNy * nx;
							const dist = smoothSpeed * dt;
							const rawCurvature = dist > 1e-6 ? Math.abs(crossSigned) / dist : 0;
							// Smooth so speed ramps gently
							const tEase = 1 - Math.exp(-dt * 2.0);
							smoothTurnRate += (rawCurvature - smoothTurnRate) * tEase;

							// Front-wheel steer: same signed curvature drives the
							// wheel angle. Positive cross = CCW (left) turn in world,
							// which in the SVG local frame means tilting the wheel
							// tops toward −x (negative SVG rotation), hence the flip.
							const signedCurv = dist > 1e-6 ? crossSigned / dist : 0;
							const maxSteer = 26;
							const targetSteer = Math.max(-maxSteer, Math.min(maxSteer, -signedCurv * 4));
							const stEase = 1 - Math.exp(-dt * 8.0);
							steerAngle += (targetSteer - steerAngle) * stEase;
						}
						prevNx = nx;
						prevNy = ny;

						// Map curvature to target speed: 0 = straight → max,
						// high curvature = tight turn → min.
						// Curvature ~0 = straight, ~8+ = tight curve
						const k = Math.min(smoothTurnRate / 8.0, 1.0);
						const targetSpeed = maxSpeed * (1 - k) + minSpeed * k;

						// Smooth the speed itself so transitions are gentle
						const sEase = 1 - Math.exp(-dt * 2.0);
						smoothSpeed += (targetSpeed - smoothSpeed) * sEase;

						carPx += nx * smoothSpeed * dt;
						carPy += ny * smoothSpeed * dt;

						// Visual heading follows the smoothed direction
						const targetHeading = Math.atan2(ny, nx);
						let diff = targetHeading - carHeading;
						diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
						carHeading += diff * Math.min(dt * 5.0, 0.25);
					}
				}

				// Hard clamp as safety net (boundary avoidance is folded
				// into the raw direction above, so this rarely fires).
				carPx = Math.max(-edgeX, Math.min(edgeX, carPx));
				carPy = Math.max(-edgeY, Math.min(edgeY, carPy));

				// ── Position the car DOM element ────────────────────
				if (carEl && rect) {
					const carEase = easeOutCubic(carPlace);
					const carScale = 0.82 + 0.18 * carEase;
					const screenU = carPx / aspect + 0.5;
					const screenV = carPy + 0.5;
					const cssX = screenU * rect.width;
					const cssY = (1 - screenV) * rect.height;

					const cssAngle = -((carHeading * 180) / Math.PI) + 90;

					carEl.style.opacity = carEase.toFixed(3);
					carEl.style.transform =
						`translate(-50%, -50%) translate(${cssX}px, ${cssY}px) ` +
						`rotate(${cssAngle}deg) scale(${carScale.toFixed(3)})`;
				}

				// Rotate front wheels around their own centres to show steering.
				if (frontLeftWheel && frontRightWheel) {
					const a = steerAngle.toFixed(2);
					frontLeftWheel.setAttribute('transform', `rotate(${a} 1.5 8.6)`);
					frontRightWheel.setAttribute('transform', `rotate(${a} 16.5 8.6)`);
				}

				renderer!.render(scene, camera);
			}

			resize();
			ro = new ResizeObserver(resize);
			ro.observe(host);
			raf = requestAnimationFrame(tick);

			cleanup = () => {
				cancelAnimationFrame(raf);
				raf = 0;
				window.removeEventListener('pointermove', onMove);
				window.removeEventListener('pointerleave', onLeave);
				ro?.disconnect();
				themeObs.disconnect();
				quad.dispose();
				material.dispose();
				renderer?.dispose();
				renderer = null;
			};
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	});

	onDestroy(() => {
		if (raf) cancelAnimationFrame(raf);
		ro?.disconnect();
	});
</script>

<div bind:this={host} class="relative h-full w-full overflow-hidden">
	<canvas
		bind:this={canvas}
		class="absolute inset-0 h-full w-full"
		data-cursor="ignore"
		aria-hidden="true"
	></canvas>

	<!-- Wandering car overlay -->
	<div
		bind:this={carEl}
		class="pointer-events-none absolute top-0 left-0 z-10"
		aria-hidden="true"
		style="will-change: transform, opacity; opacity: 0;"
	>
		<svg
			width="18"
			height="28"
			viewBox="0 0 18 28"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			class="text-accent drop-shadow-sm"
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
	</div>
</div>
