// One persistent pool of bricks plays every role in the piece: the same
// pieces assemble into the dragon, tear down to the floor, rise again as
// the tub-era chimera, then the Saturn V — the real 21309 build, every
// part's position and rotation baked from the LDraw OMR model (see
// scripts/fetch-omr.mjs) — and finally gather into a single mound. The
// bricks persist, only the arrangements change. Everything is posed
// purely as a function of scroll progress so the whole piece scrubs
// cleanly in both directions — no timelines, no physics, every frame
// derivable from `p` alone.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import setData from './data/saturn-v.json';

// Stud pitch is 1 world unit; real bricks are 9.6mm tall on an 8mm pitch,
// hence the 1.2 height. The gap carves visible mortar lines between
// neighbors so a wall reads as coursed bricks instead of a solid slab.
const BRICK_H = 1.2;
const GAP = 0.12;

// A brick on the stud grid: `x/z` are the min corner in studs, `w/d` the
// footprint, `layer` the course index (0 = on the floor).
type BrickSpec = { x: number; z: number; w: number; d: number; layer: number; color: number };

// One placed brick of a model, in pool terms: which footprint it draws
// from (`key`), where it sits assembled (`target` + `quat` — baked models
// place parts at arbitrary rotations), its 0..1 assembly rank, and color.
// Both the procedural grid models and the baked LDraw build reduce to
// this, so the pool doesn't care where a model came from.
type Cast = {
	key: string;
	target: THREE.Vector3;
	quat: THREE.Quaternion;
	order: number;
	color: number;
};

// The stud-count footprint behind a cast key — what the InstancedMesh
// geometry is built from.
type Footprint = { w: number; d: number; h: number; studs: boolean };

// A brick in the persistent pool — a slot `idx` in the InstancedMesh for
// its footprint (thousands of bricks, a handful of draw calls). `targets[m]`
// / `quats[m]` are its assembled pose in model m (null when that model
// doesn't cast it — it stays loose on the floor). `colors[m]` is its color
// *before* model m assembles, with `colors[MODEL_COUNT]` the final state,
// so color is as scrub-pure as position: unused bricks carry their
// previous color forward.
type PoolBrick = {
	im: THREE.InstancedMesh;
	idx: number;
	home: THREE.Vector3; // loose-on-the-floor rest position
	homeQuat: THREE.Quaternion;
	mound: THREE.Vector3; // coda pile position
	moundQuat: THREE.Quaternion;
	tumble: number; // transient tilt while airborne
	drop: number; // 0..1 per-brick stagger for collapse/gather
	targets: (THREE.Vector3 | null)[];
	quats: (THREE.Quaternion | null)[];
	orders: number[]; // 0..1 assembly rank per model (0 when unused)
	colors: THREE.Color[];
};

export type BrickSceneHandle = {
	setProgress(p: number): void;
	resize(width: number, height: number): void;
	dispose(): void;
};

// Deterministic RNG so the same "sets" and scatter constellations render
// on every visit — the piece should feel authored, not shuffled.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

type Rng = () => number;
const pick = (rng: Rng, arr: number[]) => arr[Math.floor(rng() * arr.length)];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const smoothstep = (lo: number, hi: number, v: number) => {
	const k = clamp01((v - lo) / (hi - lo));
	return k * k * (3 - 2 * k);
};
// Remap t so a phase occupies [lo, hi] of a section and clamps outside it.
const span = (t: number, lo: number, hi: number) => clamp01((t - lo) / (hi - lo));

// Fill a w×d footprint at one course with 2x4/2x2/1-wide bricks, running
// bond staggered by course parity so stacked slabs look brick-laid.
function slab(
	out: BrickSpec[],
	rng: Rng,
	pal: number[],
	x0: number,
	z0: number,
	w: number,
	d: number,
	layer: number
): void {
	for (let z = 0; z < d; z += 2) {
		const rowD = Math.min(2, d - z);
		let x = 0;
		if ((layer + z / 2) % 2 === 1 && w > 2) {
			out.push({ x: x0, z: z0 + z, w: 2, d: rowD, layer, color: pick(rng, pal) });
			x = 2;
		}
		while (x < w) {
			const len = w - x >= 4 && rng() < 0.7 ? 4 : Math.min(2, w - x);
			out.push({ x: x0 + x, z: z0 + z, w: len, d: rowD, layer, color: pick(rng, pal) });
			x += len;
		}
	}
}

// ── Fake sets ────────────────────────────────────────────────────────────
// Silhouettes only need to read at a glance from 25 units away: a long
// body with wings and a stepped neck says "dragon" without a single
// molded part. Colors are classic LEGO hexes.

function dragonSpecs(): BrickSpec[] {
	const out: BrickSpec[] = [];
	const rng = mulberry32(7);
	const greens = [0x237841, 0x184632, 0x635f61];
	slab(out, rng, greens, 0, 0, 10, 4, 0); // body
	slab(out, rng, greens, 0, 0, 10, 4, 1);
	slab(out, rng, [0x184632], 3, -5, 4, 5, 2); // wings
	slab(out, rng, [0x184632], 3, 4, 4, 5, 2);
	[8, 8, 9, 9, 10].forEach((x, i) =>
		out.push({ x, z: 1, w: 2, d: 2, layer: 2 + i, color: 0x237841 })
	); // neck steps up + forward
	out.push({ x: 10, z: 1, w: 2, d: 2, layer: 7, color: 0x237841 }); // head
	out.push({ x: 12, z: 1, w: 2, d: 2, layer: 7, color: 0x184632 }); // snout
	out.push({ x: -2, z: 1, w: 2, d: 2, layer: 1, color: 0x237841 }); // tail steps down
	out.push({ x: -4, z: 1, w: 2, d: 2, layer: 0, color: 0x237841 });
	out.push({ x: -6, z: 1, w: 2, d: 1, layer: 0, color: 0x184632 });
	return out;
}

// The tub build: deliberately wrong — mixed palette, a leaning tower, a
// truck cab, a dragon wing bolted where no wing belongs, loose greebles.
function chimeraSpecs(): BrickSpec[] {
	const out: BrickSpec[] = [];
	const rng = mulberry32(21);
	const mix = [0xc4281c, 0x0d69ab, 0xf5cd2f, 0x237841, 0xf2f3f2, 0xa3a2a4];
	slab(out, rng, mix, 0, 0, 8, 6, 0);
	slab(out, rng, mix, 0, 0, 8, 6, 1);
	for (let i = 0; i < 6; i++) {
		out.push({ x: Math.floor(i / 3), z: 0, w: 2, d: 2, layer: 2 + i, color: pick(rng, mix) });
	}
	slab(out, rng, mix, 4, 2, 4, 4, 2); // cab
	slab(out, rng, mix, 4, 2, 4, 4, 3);
	slab(out, rng, [0x184632], 5, 6, 2, 4, 4); // the wing, overhanging
	for (let i = 0; i < 6; i++) {
		out.push({
			x: Math.floor(rng() * 3),
			z: 3 + Math.floor(rng() * 2),
			w: 1,
			d: 2,
			layer: 2,
			color: pick(rng, mix)
		});
	}
	return out;
}

// ── Casts ────────────────────────────────────────────────────────────────
// Both model sources reduce to Cast lists. Grid specs (the procedural
// childhood builds) get identity rotations and uniform brick height; the
// baked LDraw build carries real per-part poses and footprints.

const IDENTITY = new THREE.Quaternion();
const footKey = (f: Footprint) => `${f.w}x${f.d}x${f.h}${f.studs ? 's' : ''}`;

// Registry of every footprint seen while building casts, so the pool can
// recover dimensions from a key when it creates meshes.
const footprints = new Map<string, Footprint>();

function registerFoot(f: Footprint): string {
	const key = footKey(f);
	if (!footprints.has(key)) footprints.set(key, f);
	return key;
}

// Normalize ranks to 0..1 given each cast's sort key: assembly order.
function rankOrders(keys: number[]): number[] {
	const ranked = keys.map((key, i) => ({ i, key })).sort((a, b) => a.key - b.key);
	const orders = new Array<number>(keys.length);
	ranked.forEach((r, rank) => (orders[r.i] = keys.length > 1 ? rank / (keys.length - 1) : 0));
	return orders;
}

// Grid specs → casts: origin-centered targets, bottom course first with a
// diagonal sweep within a course.
function gridCasts(specs: BrickSpec[]): Cast[] {
	let minX = Infinity,
		maxX = -Infinity,
		minZ = Infinity,
		maxZ = -Infinity;
	for (const s of specs) {
		minX = Math.min(minX, s.x);
		maxX = Math.max(maxX, s.x + s.w);
		minZ = Math.min(minZ, s.z);
		maxZ = Math.max(maxZ, s.z + s.d);
	}
	const cx = (minX + maxX) / 2;
	const cz = (minZ + maxZ) / 2;
	const orders = rankOrders(specs.map((s) => s.layer * 1000 + s.x + s.z));
	return specs.map((s, i) => ({
		key: registerFoot({ w: s.w, d: s.d, h: BRICK_H, studs: true }),
		target: new THREE.Vector3(s.x + s.w / 2 - cx, (s.layer + 0.5) * BRICK_H, s.z + s.d / 2 - cz),
		quat: IDENTITY,
		order: orders[i],
		color: s.color
	}));
}

// The baked build → casts. Positions/quaternions come straight from the
// OMR data (already grounded and centered by the bake). The rocket lies
// along x, so assembly sweeps stage by stage down its length — tail to
// nose — rather than bottom-up.
function bakedCasts(): Cast[] {
	const orders = rankOrders(setData.bricks.map((b) => b.p[0] * 1000 + b.p[1] * 10 + b.p[2]));
	return setData.bricks.map((b, i) => ({
		key: registerFoot({ w: b.w, d: b.d, h: b.h, studs: b.studs }),
		target: new THREE.Vector3(b.p[0], b.p[1], b.p[2]),
		quat: new THREE.Quaternion(b.q[0], b.q[1], b.q[2], b.q[3]),
		order: orders[i],
		color: parseInt(b.c, 16)
	}));
}

// ── Meshes ───────────────────────────────────────────────────────────────
// One merged geometry (box + stud cylinders) per footprint, cached. All
// bricks of a footprint share one InstancedMesh and one material —
// per-brick color crossfades go through instanceColor — so ~2,000 pieces
// cost as many draw calls as there are footprints, not bricks.

const geometryCache = new Map<string, THREE.BufferGeometry>();

function brickGeometry(f: Footprint): THREE.BufferGeometry {
	const key = footKey(f);
	let geo = geometryCache.get(key);
	if (geo) return geo;
	const parts: THREE.BufferGeometry[] = [
		new THREE.BoxGeometry(f.w - GAP, f.h - GAP / 2, f.d - GAP)
	];
	if (f.studs) {
		const stud = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 10);
		for (let i = 0; i < f.w; i++) {
			for (let j = 0; j < f.d; j++) {
				const s = stud.clone();
				s.translate(i + 0.5 - f.w / 2, f.h / 2, j + 0.5 - f.d / 2);
				parts.push(s);
			}
		}
		stud.dispose();
	}
	geo = mergeGeometries(parts);
	parts.forEach((p) => p.dispose());
	geometryCache.set(key, geo);
	return geo;
}

// Loose-brick palette for the pool at rest — the tub, before any set.
const TUB = [0xc4281c, 0x0d69ab, 0xf5cd2f, 0x237841, 0xf2f3f2, 0xa3a2a4];

// ── Pool ─────────────────────────────────────────────────────────────────
// Sized per footprint to the largest demand across models, then padded to
// the set's real piece count (setData.numParts) — the padding never
// assembles, it *is* the loose floor scatter, so the number of bricks on
// screen is honest. Every model is cast entirely from the shared pool; a
// dragon wing may serve as a rocket panel two sections later — that's the
// point.

type BrickPool = {
	bricks: PoolBrick[];
	meshes: THREE.InstancedMesh[];
	material: THREE.MeshStandardMaterial;
};

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function buildPool(castLists: Cast[][], seed: number): BrickPool {
	const rng = mulberry32(seed);

	// Bucket each model's casts by footprint key.
	const castings = castLists.map((casts) => {
		const byFootprint = new Map<string, Cast[]>();
		for (const c of casts) {
			const list = byFootprint.get(c.key) ?? [];
			list.push(c);
			byFootprint.set(c.key, list);
		}
		return byFootprint;
	});

	const demand = new Map<string, number>();
	for (const cast of castings) {
		for (const [k, list] of cast) demand.set(k, Math.max(demand.get(k) ?? 0, list.length));
	}

	// Pad to the real piece count, distributing the surplus across
	// footprints in proportion to demand so the scatter's mix of sizes
	// still looks like the models it feeds.
	let total = 0;
	for (const n of demand.values()) total += n;
	const deficit = Math.max(0, setData.numParts - total);
	const keys = [...demand.keys()];
	let added = 0;
	keys.forEach((k, i) => {
		const share =
			i === keys.length - 1 ? deficit - added : Math.round((deficit * demand.get(k)!) / total);
		demand.set(k, demand.get(k)! + share);
		added += share;
	});

	const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0 });
	const pool: PoolBrick[] = [];
	const meshes: THREE.InstancedMesh[] = [];
	const byKey = new Map<string, PoolBrick[]>();
	for (const [k, count] of demand) {
		const foot = footprints.get(k)!;
		const im = new THREE.InstancedMesh(brickGeometry(foot), material, count);
		im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		im.castShadow = true;
		im.receiveShadow = true;
		meshes.push(im);
		const bricks: PoolBrick[] = [];
		for (let i = 0; i < count; i++) {
			const rest = new THREE.Color(pick(rng, TUB));
			// Coda mound: taller toward the center so it reads as a poured
			// pile, not a cylinder of floating bricks.
			const a = rng() * Math.PI * 2;
			const r = Math.sqrt(rng()) * 11;
			const brick: PoolBrick = {
				im,
				idx: i,
				home: new THREE.Vector3((rng() * 2 - 1) * 30, foot.h / 2, (rng() * 2 - 1) * 14),
				homeQuat: new THREE.Quaternion().setFromAxisAngle(Y_AXIS, (rng() * 2 - 1) * 1.3),
				mound: new THREE.Vector3(
					Math.cos(a) * r,
					foot.h / 2 + Math.floor(rng() * (1 + 7 * (1 - r / 11))) * BRICK_H,
					Math.sin(a) * r * 0.8
				),
				moundQuat: new THREE.Quaternion().setFromAxisAngle(Y_AXIS, (rng() * 2 - 1) * 1.6),
				tumble: (rng() * 2 - 1) * 0.5,
				drop: rng(),
				targets: castLists.map(() => null),
				quats: castLists.map(() => null),
				orders: castLists.map(() => 0),
				colors: [rest]
			};
			bricks.push(brick);
			pool.push(brick);
		}
		byKey.set(k, bricks);
	}

	// Cast each model from the pool, then extend each brick's color
	// timeline: colors[m + 1] is the cast color when used, else a carry
	// of colors[m].
	castings.forEach((cast, m) => {
		for (const [k, list] of cast) {
			const bricks = byKey.get(k)!;
			list.forEach((c, i) => {
				bricks[i].targets[m] = c.target;
				bricks[i].quats[m] = c.quat;
				bricks[i].orders[m] = c.order;
			});
		}
	});
	for (let m = 0; m < castLists.length; m++) {
		for (const b of pool) b.colors.push(b.colors[m].clone());
		for (const [k, list] of castings[m]) {
			const bricks = byKey.get(k)!;
			list.forEach((c, i) => bricks[i].colors[m + 1].setHex(c.color));
		}
	}
	return { bricks: pool, meshes, material };
}

// ── Posing ───────────────────────────────────────────────────────────────
// Bricks fly in from their floor homes with a small arc and a transient
// tilt, staggered by assembly order; collapses run top-first with gravity
// easing so the fall reads as a teardown, not a rewind. Bricks a model
// doesn't cast simply rest at home — the floor scatter is persistent.

const STAGGER = 0.32;

// Scratch objects for writing instance transforms/colors without
// allocating per brick per frame. Rotations are quaternion slerps —
// home yaw to the cast's arbitrary baked orientation — with a transient
// roll about z layered on while airborne.
const DUMMY = new THREE.Object3D();
const TMP = new THREE.Color();
const Q_ROLL = new THREE.Quaternion();
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function commit(b: PoolBrick, color: THREE.Color): void {
	DUMMY.updateMatrix();
	b.im.setMatrixAt(b.idx, DUMMY.matrix);
	b.im.setColorAt(b.idx, color);
}

function roll(angle: number): void {
	if (angle === 0) return;
	Q_ROLL.setFromAxisAngle(Z_AXIS, angle);
	DUMMY.quaternion.premultiply(Q_ROLL);
}

function restPose(b: PoolBrick, colorIdx: number): void {
	DUMMY.position.copy(b.home);
	DUMMY.quaternion.copy(b.homeQuat);
	commit(b, b.colors[colorIdx]);
}

function poseAssemble(pool: PoolBrick[], m: number, t: number): void {
	for (const b of pool) {
		const to = b.targets[m];
		if (!to) {
			restPose(b, m);
			continue;
		}
		const k = clamp01((t * (1 + STAGGER) - b.orders[m]) / STAGGER);
		const e = easeOutCubic(k);
		const lift = Math.sin(e * Math.PI);
		DUMMY.position.lerpVectors(b.home, to, e);
		DUMMY.position.y += lift * 2.4;
		DUMMY.quaternion.slerpQuaternions(b.homeQuat, b.quats[m]!, e);
		roll(b.tumble * lift);
		commit(b, TMP.lerpColors(b.colors[m], b.colors[m + 1], e));
	}
}

function poseCollapse(pool: PoolBrick[], m: number, t: number): void {
	for (const b of pool) {
		const from = b.targets[m];
		if (!from) {
			restPose(b, m + 1);
			continue;
		}
		const lead = 0.65 * (1 - b.orders[m]) + 0.35 * b.drop;
		const k = clamp01((t - lead * 0.5) / 0.5);
		const e = k * k;
		DUMMY.position.lerpVectors(from, b.home, e);
		DUMMY.quaternion.slerpQuaternions(b.quats[m]!, b.homeQuat, e);
		roll(b.tumble * Math.sin(e * Math.PI) * 0.7);
		commit(b, b.colors[m + 1]);
	}
}

// The coda pulls the whole pool — assembled and loose alike — into one
// pile at rest. `last` is the model the gather starts from.
function poseMound(pool: PoolBrick[], last: number, t: number): void {
	for (const b of pool) {
		const from = b.targets[last] ?? b.home;
		const fromQuat = b.quats[last] ?? b.homeQuat;
		const k = clamp01((t - b.drop * 0.4) / 0.6);
		const e = k * k * (3 - 2 * k);
		DUMMY.position.lerpVectors(from, b.mound, e);
		DUMMY.position.y += Math.sin(e * Math.PI) * 1.4;
		DUMMY.quaternion.slerpQuaternions(fromQuat, b.moundQuat, e);
		roll(b.tumble * Math.sin(e * Math.PI) * 0.5);
		commit(b, b.colors[last + 1]);
	}
}

// ── Scene ────────────────────────────────────────────────────────────────

// Section count matches the page: hero + six vignettes.
const SECTIONS = 7;

// Horizontal frame shift per section as a fraction of viewport width —
// positive pushes the build to the right of the frame, always opposite
// the prose column. Applied via camera.setViewOffset so the clearance is
// pixel-true regardless of orbit angle or model size (a world-space
// offset can't guarantee that); zeroed on phones, where the prose sits on
// a scrim instead.
const FRACS = [0.16, 0.2, -0.2, 0.2, -0.2, 0.2, -0.2];

// Per-section camera framing: orbit radius and look-at height. The
// Saturn V lies ~124 studs long — an order of magnitude wider than the
// childhood sets — so the camera pulls far back for v5, then settles back
// in for the coda mound. Interpolated with the same glide as the frame
// shift.
const RADII = [46, 32, 32, 30, 38, 96, 48];
const LOOKS = [2, 3.5, 3.5, 3.5, 3, 11, 3.5];

export function createBrickScene(canvas: HTMLCanvasElement): BrickSceneHandle {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 260);
	scene.add(new THREE.HemisphereLight(0xffffff, 0x665f55, 2.0));
	const sun = new THREE.DirectionalLight(0xffffff, 2.5);
	sun.position.set(28, 48, 20);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	// The frustum spans the rocket's full ±62-stud length.
	sun.shadow.camera.left = -70;
	sun.shadow.camera.right = 70;
	sun.shadow.camera.top = 70;
	sun.shadow.camera.bottom = -70;
	sun.shadow.camera.near = 2;
	sun.shadow.camera.far = 150;
	sun.shadow.bias = -0.0004;
	scene.add(sun);

	// Contact shadows ground the bricks without painting a visible floor —
	// ShadowMaterial renders nothing but the shadow itself, so the page
	// background still reads through the transparent canvas.
	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(240, 240),
		new THREE.ShadowMaterial({ opacity: 0.14 })
	);
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	scene.add(ground);

	const pool = buildPool([gridCasts(dragonSpecs()), gridCasts(chimeraSpecs()), bakedCasts()], 11);
	for (const m of pool.meshes) scene.add(m);
	const bricks = pool.bricks;

	let progress = 0;
	let offsetScale = 1;
	let radiusScale = 1;
	let radius = RADII[0];
	let lookY = LOOKS[0];
	let viewW = 1;
	let viewH = 1;

	// Choreography over the shared pool — every boundary is continuous
	// (each phase ends where the next begins), so there are no visibility
	// swaps or scale-to-zero seams between sections:
	//   hero  loose bricks at rest        v4  chimera falls (closet years)
	//   v1    dragon assembles            v5  the Saturn V assembles
	//   v2    dragon holds, torn down     v6  everything gathers into the
	//   v3    chimera rises from floor        coda mound
	function pose(): void {
		const s = Math.min(progress, 0.9999) * SECTIONS;
		const sec = Math.floor(s);
		const t = s - sec;

		if (sec === 0) poseAssemble(bricks, 0, 0);
		else if (sec === 1) poseAssemble(bricks, 0, span(t, 0.05, 0.85));
		else if (sec === 2) {
			if (t < 0.25) poseAssemble(bricks, 0, 1);
			else poseCollapse(bricks, 0, span(t, 0.25, 0.95));
		} else if (sec === 3) poseAssemble(bricks, 1, span(t, 0.08, 0.85));
		else if (sec === 4) {
			if (t < 0.15) poseAssemble(bricks, 1, 1);
			else poseCollapse(bricks, 1, span(t, 0.15, 0.8));
		} else if (sec === 5) poseAssemble(bricks, 2, span(t, 0.08, 0.8));
		else if (t < 0.15) poseAssemble(bricks, 2, 1);
		else poseMound(bricks, 2, span(t, 0.15, 0.85));

		for (const m of pool.meshes) {
			m.instanceMatrix.needsUpdate = true;
			if (m.instanceColor) m.instanceColor.needsUpdate = true;
		}

		// Glide the frame shift — and the camera framing — across the back
		// half of each section so the build drifts, not darts, to the other
		// side as the next prose block arrives.
		const u = smoothstep(0.45, 0.95, t);
		const nextSec = Math.min(sec + 1, SECTIONS - 1);
		const frac = (FRACS[sec] + (FRACS[nextSec] - FRACS[sec]) * u) * offsetScale;
		camera.setViewOffset(viewW, viewH, -frac * viewW, 0, viewW, viewH);
		radius = (RADII[sec] + (RADII[nextSec] - RADII[sec]) * u) * radiusScale;
		lookY = LOOKS[sec] + (LOOKS[nextSec] - LOOKS[sec]) * u;
	}

	// Idle drift keeps the scene alive while the reader sits still; scroll
	// adds its own azimuth so fast scrolling also swings the camera. Drift
	// is dropped (not the scrub — that stays user-driven) under
	// prefers-reduced-motion.
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const clock = new THREE.Clock();
	let drift = 0.35;
	let raf = 0;
	function frame(): void {
		raf = requestAnimationFrame(frame);
		if (!reduced) drift += clock.getDelta() * 0.06;
		else clock.getDelta();
		const a = drift + progress * 0.55;
		camera.position.set(Math.sin(a) * radius, radius * 0.42, Math.cos(a) * radius);
		camera.lookAt(0, lookY, 0);
		renderer.render(scene, camera);
	}

	pose();
	frame();

	return {
		setProgress(p: number): void {
			progress = clamp01(p);
			pose();
		},
		resize(width: number, height: number): void {
			viewW = width;
			viewH = height;
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			offsetScale = width >= 768 ? 1 : 0;
			radiusScale = width >= 768 ? 1 : 1.3;
			pose();
		},
		dispose(): void {
			cancelAnimationFrame(raf);
			geometryCache.forEach((g) => g.dispose());
			geometryCache.clear();
			for (const m of pool.meshes) m.dispose();
			pool.material.dispose();
			ground.geometry.dispose();
			ground.material.dispose();
			renderer.dispose();
		}
	};
}
