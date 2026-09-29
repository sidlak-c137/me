// Bakes an LDraw OMR model (exact official build, CCAL-licensed) into
// src/lib/data/<slug>.json: one entry per placed part with world position,
// rotation quaternion, a w×d×h stud footprint computed from the part's
// actual LDraw geometry (recursive bounding box), and its LDraw color. The
// scene renders each part as a studded prism — real placement, simplified
// part geometry. Run once; the baked JSON is committed so builds never
// touch the network.
//
//   Usage: node scripts/fetch-omr.mjs [set-num] [slug] [--lay]
//   e.g.:  node scripts/fetch-omr.mjs 21309-1 saturn-v --lay
//
// --lay rotates the model 90° so its vertical axis runs along +x — the
// Saturn V's official display pose, and a far better fit for a landscape
// viewport than a 100-stud-tall tower.
import { gunzipSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const LIB = 'https://library.ldraw.org/library/';
const args = process.argv.slice(2).filter((a) => a !== '--lay');
const lay = process.argv.includes('--lay');
const [setNum = '21309-1', slug = 'saturn-v'] = args;

async function text(url) {
	for (let attempt = 0; ; attempt++) {
		const res = await fetch(url);
		if (res.ok) return res.text();
		if (res.status !== 429 || attempt >= 4) throw new Error(`${url}: HTTP ${res.status}`);
		await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
	}
}

// ── MPD → flat part placements ───────────────────────────────────────────
const mpd = await text(`${LIB}omr/${setNum}.mpd`);

// Split the MPD into its member files, keyed by lowercased name.
const files = new Map();
let current = null;
for (const raw of mpd.split(/\r?\n/)) {
	const m = raw.match(/^0\s+FILE\s+(.+?)\s*$/i);
	if (m) {
		current = { name: m[1].toLowerCase(), lines: [] };
		files.set(current.name, current);
	} else if (current) current.lines.push(raw.trim());
}
const root = files.values().next().value;

// A member file that declares itself a part is a leaf (we don't recurse
// into part internals — they're primitives, not placements).
const isPart = (f) => f.lines.some((l) => /^0\s+!LDRAW_ORG\s+\S*Part/i.test(l));

// Recursive walk accumulating rotation+translation; color 16 inherits.
const placements = []; // { part, color, M: THREE.Matrix4 }
function walk(file, parent, color) {
	for (const line of file.lines) {
		if (!line.startsWith('1 ')) continue;
		const tok = line.split(/\s+/);
		const c = tok[1] === '16' ? color : tok[1];
		const [x, y, z, a, b, cc, d, e, f, g, h, i] = tok.slice(2, 14).map(Number);
		const local = new THREE.Matrix4().set(a, b, cc, x, d, e, f, y, g, h, i, z, 0, 0, 0, 1);
		const M = new THREE.Matrix4().multiplyMatrices(parent, local);
		const ref = tok.slice(14).join(' ').toLowerCase();
		const sub = files.get(ref);
		if (sub && !isPart(sub)) walk(sub, M, c);
		else placements.push({ part: ref, color: c, M });
	}
}
walk(root, new THREE.Matrix4(), '16');
console.log(`${placements.length} parts placed from ${setNum}.mpd`);

// ── Official library: one complete.zip, cached in the OS temp dir ───────
// Per-file requests get rate-limited (HTTP 429) long before the ~500
// files a recursive resolve needs, so the whole library comes down once.
const cacheDir = join(tmpdir(), 'ldraw-library');
if (!existsSync(join(cacheDir, 'ldraw', 'parts'))) {
	console.log('downloading LDraw complete.zip (once, cached in tmp)…');
	const zip = await fetch(`${LIB}updates/complete.zip`);
	if (!zip.ok) throw new Error(`complete.zip: HTTP ${zip.status}`);
	mkdirSync(cacheDir, { recursive: true });
	const zipPath = join(cacheDir, 'complete.zip');
	writeFileSync(zipPath, Buffer.from(await zip.arrayBuffer()));
	execFileSync('unzip', ['-q', '-o', zipPath, '-d', cacheDir]);
}

// ── Colors: LDConfig code → hex ──────────────────────────────────────────
const ldconfig = readFileSync(join(cacheDir, 'ldraw', 'LDConfig.ldr'), 'utf8');
const hexOf = new Map();
for (const line of ldconfig.split(/\r?\n/)) {
	const m = line.match(/^0\s+!COLOUR\s+\S+\s+CODE\s+(\d+)\s+VALUE\s+#([0-9A-Fa-f]{6})/);
	if (m) hexOf.set(m[1], m[2].toUpperCase());
}

// ── Part geometry → exact local bounding boxes ───────────────────────────
// Each part's real extent and center come from its LDraw geometry,
// resolved recursively down to primitives — no naming heuristics, no
// assumption about where the part's origin sits (it isn't always the top
// face: brackets, panels, cones all differ). Sub-box corners are
// transformed rather than every vertex, so each file's box is computed
// once and memoized. Top studs are excluded from the box (the scene adds
// its own) but noted, so tiles render smooth; stud3/stud4 are underside
// tubes, skipped entirely. Unofficial parts (rare) fall back to the
// website with a retry-and-wait for 429s.

const fileCache = new Map(); // normalized name → lines[] | null
async function ldrawFile(name) {
	const key = name.toLowerCase().replace(/\\/g, '/');
	if (files.has(key)) return files.get(key).lines;
	if (fileCache.has(key)) return fileCache.get(key);
	let raw = null;
	for (const dir of ['parts', 'p']) {
		const p = join(cacheDir, 'ldraw', dir, key);
		if (existsSync(p)) {
			raw = readFileSync(p, 'utf8');
			break;
		}
	}
	if (raw === null) {
		for (const dir of ['unofficial/parts/', 'unofficial/p/']) {
			for (let attempt = 0; attempt < 5 && raw === null; attempt++) {
				const res = await fetch(`${LIB}${dir}${key}`);
				if (res.ok) raw = await res.text();
				else if (res.status === 429) await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
				else break;
			}
			if (raw !== null) break;
		}
	}
	const lines = raw === null ? null : raw.split(/\r?\n/).map((l) => l.trim());
	fileCache.set(key, lines);
	return lines;
}

// Each file flattens to an exact vertex list in its own frame (children's
// vertices transformed through their placement matrices) — transforming
// sub-box corners instead would inflate rotated primitives. Top studs
// (stud, stud2, …) contribute only their base point: the scene draws its
// own studs, so the 4 LDU protrusion must not count toward the box. But
// stud3/stud4 underside tubes are real geometry — some parts build their
// body walls from scaled stud4s (e.g. 6141) — so they recurse normally.
const vertsCache = new Map(); // normalized name → { verts, studs } | null
async function partVerts(name) {
	const key = name.toLowerCase().replace(/\\/g, '/');
	if (vertsCache.has(key)) return vertsCache.get(key);
	vertsCache.set(key, null); // cycle guard
	const lines = await ldrawFile(key);
	if (!lines) return null;
	const verts = [];
	let studs = false;
	const V = new THREE.Vector3();
	for (const line of lines) {
		const tok = line.split(/\s+/);
		if (tok[0] === '2' || tok[0] === '3' || tok[0] === '4') {
			const count = tok[0] === '2' ? 2 : tok[0] === '3' ? 3 : 4;
			for (let i = 0; i < count; i++) {
				verts.push(Number(tok[2 + i * 3]), Number(tok[3 + i * 3]), Number(tok[4 + i * 3]));
			}
		} else if (tok[0] === '1') {
			const ref = tok.slice(14).join(' ').toLowerCase().replace(/\\/g, '/');
			const base = ref.split('/').pop();
			const [x, y, z, a, b, c, d, e, f, g, h, i] = tok.slice(2, 14).map(Number);
			const M = new THREE.Matrix4().set(a, b, c, x, d, e, f, y, g, h, i, z, 0, 0, 0, 1);
			if (base.startsWith('stud') && !base.startsWith('stud3') && !base.startsWith('stud4')) {
				studs = true;
				V.set(0, 0, 0).applyMatrix4(M);
				verts.push(V.x, V.y, V.z);
				continue;
			}
			const sub = await partVerts(ref);
			if (!sub) continue;
			if (sub.studs) studs = true;
			for (let j = 0; j < sub.verts.length; j += 3) {
				V.set(sub.verts[j], sub.verts[j + 1], sub.verts[j + 2]).applyMatrix4(M);
				verts.push(V.x, V.y, V.z);
			}
		}
	}
	const out = verts.length ? { verts, studs } : null;
	vertsCache.set(key, out);
	return out;
}

const boxCache = new Map(); // normalized name → { min, max, studs } | null
async function partBox(name) {
	const key = name.toLowerCase().replace(/\\/g, '/');
	if (boxCache.has(key)) return boxCache.get(key);
	const v = await partVerts(key);
	let box = null;
	if (v) {
		const min = [Infinity, Infinity, Infinity];
		const max = [-Infinity, -Infinity, -Infinity];
		for (let j = 0; j < v.verts.length; j += 3) {
			for (let k = 0; k < 3; k++) {
				min[k] = Math.min(min[k], v.verts[j + k]);
				max[k] = Math.max(max[k], v.verts[j + k]);
			}
		}
		box = { min, max, studs: v.studs };
	}
	boxCache.set(key, box);
	return box;
}

// Resolve boxes for every unique placed part (throttled; primitives are
// shared and memoized, so the fetch count stays modest).
const need = [...new Set(placements.map((p) => p.part))];
for (let i = 0; i < need.length; i += 8) {
	await Promise.all(need.slice(i, i + 8).map(partBox));
}
const missing = need.filter((p) => !boxCache.get(p.toLowerCase().replace(/\\/g, '/')));
console.log(`resolved ${need.length - missing.length}/${need.length} part boxes`, missing);

// Box → stud footprint (LDraw: 20 LDU per stud, y is height).
function footprint(box) {
	if (!box) return { w: 1, d: 1, h: 0.4, studs: false };
	const clampDim = (ldu) => Math.min(16, Math.max(1, Math.round(ldu / 20)));
	const h = Math.min(9.6, Math.max(0.2, Math.round(((box.max[1] - box.min[1]) / 20) * 100) / 100));
	return {
		w: clampDim(box.max[0] - box.min[0]),
		d: clampDim(box.max[2] - box.min[2]),
		h,
		studs: box.studs
	};
}

// ── LDraw space → scene space ────────────────────────────────────────────
// LDraw is y-down, 20 LDU per stud, 24 LDU per brick height; the scene is
// y-up with 1 stud = 1 unit (so a brick is 1.2 units tall). Conjugating
// the rotation with the y-flip keeps it a proper rotation. The prism is
// centered on the part's true box center — no origin assumptions.
const FLIP = new THREE.Matrix4().makeScale(1, -1, 1);
const LAY = new THREE.Matrix4().makeRotationZ(-Math.PI / 2);
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scale = new THREE.Vector3();

const bricks = placements.map((pl) => {
	const box = boxCache.get(pl.part.toLowerCase().replace(/\\/g, '/'));
	const { w, d, h, studs } = footprint(box);
	const M = pl.M.clone();
	// The box center in the part's local frame (LDU) → world.
	const center = (
		box
			? new THREE.Vector3(
					(box.min[0] + box.max[0]) / 2,
					(box.min[1] + box.max[1]) / 2,
					(box.min[2] + box.max[2]) / 2
				)
			: new THREE.Vector3()
	).applyMatrix4(M);
	M.setPosition(center);
	const world = new THREE.Matrix4().multiplyMatrices(FLIP, M).multiply(FLIP);
	if (lay) world.premultiply(LAY);
	world.decompose(pos, quat, scale);
	// LDraw mirrors some placements (det < 0); our prisms are symmetric
	// enough that dropping the mirror is invisible.
	return {
		p: [pos.x / 20, pos.y / 20, pos.z / 20],
		q: [quat.x, quat.y, quat.z, quat.w],
		w,
		d,
		h,
		studs,
		c: hexOf.get(pl.color) ?? 'AAAAAA'
	};
});

// Recenter: x/z about the bounds center, y so the lowest part touches 0.
// Each brick's world extent comes from its rotated corners — h isn't
// world-vertical for sideways-mounted parts.
const bmin = [Infinity, Infinity, Infinity];
const bmax = [-Infinity, -Infinity, -Infinity];
const corner = new THREE.Vector3();
const q = new THREE.Quaternion();
for (const b of bricks) {
	q.set(...b.q);
	for (const sx of [-1, 1])
		for (const sy of [-1, 1])
			for (const sz of [-1, 1]) {
				corner.set((sx * b.w) / 2, (sy * b.h) / 2, (sz * b.d) / 2).applyQuaternion(q);
				const v = [b.p[0] + corner.x, b.p[1] + corner.y, b.p[2] + corner.z];
				for (let k = 0; k < 3; k++) {
					bmin[k] = Math.min(bmin[k], v[k]);
					bmax[k] = Math.max(bmax[k], v[k]);
				}
			}
}
const [minX, minY, minZ] = bmin;
const [maxX, maxY, maxZ] = bmax;
const round = (v) => Math.round(v * 1000) / 1000;
for (const b of bricks) {
	b.p = [
		round(b.p[0] - (minX + maxX) / 2),
		round(b.p[1] - minY),
		round(b.p[2] - (minZ + maxZ) / 2)
	];
	b.q = b.q.map((v) => Math.round(v * 10000) / 10000);
}
console.log(`extent: ${round(maxX - minX)} x ${round(maxY - minY)} x ${round(maxZ - minZ)} studs`);

// ── Set metadata (Rebrickable CSV dump, same source as fetch-set.mjs) ────
const gz = await fetch('https://cdn.rebrickable.com/media/downloads/sets.csv.gz');
const csv = gunzipSync(Buffer.from(await gz.arrayBuffer())).toString('utf8');
const row = csv.split('\n').find((l) => l.startsWith(`${setNum},`));
const meta = row.match(/^[^,]+,(?:"([^"]*)"|([^,]*)),(\d+),[^,]*,(\d+)/);

const credit = mpd.match(/^0\s+Author:\s+(.+?)\s*$/m)?.[1] ?? 'unknown';
const data = {
	set: setNum,
	name: meta[1] ?? meta[2],
	year: Number(meta[3]),
	numParts: Number(meta[4]),
	credit: `LDraw model by ${credit}, ldraw.org OMR (CCAL 2.0)`,
	bricks
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../src/lib/data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${slug}.json`);
writeFileSync(outPath, JSON.stringify(data) + '\n');
console.log(
	`${data.name} (${data.set}, ${data.year}) — ${bricks.length} placed / ${data.numParts} in set`
);
console.log(`wrote ${outPath}`);
