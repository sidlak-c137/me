// Bakes Rebrickable data for one set into src/lib/data/<slug>.json —
// metadata plus a per-color piece histogram — using the public CSV dumps
// (https://rebrickable.com/downloads/), which need no API key. Run once
// per set; the baked JSON is committed so builds never touch the network.
//
//   Usage: node scripts/fetch-set.mjs [set-num] [slug]
//   e.g.:  node scripts/fetch-set.mjs 21061-1 notre-dame
import { gunzipSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CDN = 'https://cdn.rebrickable.com/media/downloads/';
const [setNum = '21061-1', slug = 'notre-dame'] = process.argv.slice(2);

// Minimal CSV row parser: handles quoted fields containing commas and
// doubled quotes, which is all the Rebrickable dumps use.
function parseRow(line) {
	const out = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quoted) {
			if (ch === '"' && line[i + 1] === '"') {
				field += '"';
				i++;
			} else if (ch === '"') quoted = false;
			else field += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === ',') {
			out.push(field);
			field = '';
		} else field += ch;
	}
	out.push(field);
	return out;
}

// Streams a dump into memory, gunzips, and yields only rows the filter
// keeps — inventory_parts is ~1.4M rows, so rows are never all
// materialized as objects at once.
async function csv(name, keep) {
	const res = await fetch(`${CDN}${name}.csv.gz`);
	if (!res.ok) throw new Error(`${name}.csv.gz: HTTP ${res.status}`);
	const text = gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8');
	const lines = text.split('\n');
	const header = parseRow(lines[0].trim());
	const col = Object.fromEntries(header.map((h, i) => [h, i]));
	const rows = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		const row = parseRow(line);
		if (keep(row, col)) rows.push(row);
	}
	return { col, rows };
}

const sets = await csv('sets', (r, c) => r[c.set_num] === setNum);
if (sets.rows.length !== 1) throw new Error(`set ${setNum}: found ${sets.rows.length} rows`);
const set = sets.rows[0];
const sc = sets.col;

// A set can have several inventory versions; take the latest.
const inventories = await csv('inventories', (r, c) => r[c.set_num] === setNum);
const inv = inventories.rows.reduce((a, b) =>
	Number(a[inventories.col.version]) >= Number(b[inventories.col.version]) ? a : b
);
const invId = inv[inventories.col.id];

const colors = await csv('colors', () => true);
const hexOf = new Map(colors.rows.map((r) => [r[colors.col.id], r[colors.col.rgb]]));

// Spare parts are excluded — num_parts on the set doesn't count them.
const parts = await csv(
	'inventory_parts',
	(r, c) => r[c.inventory_id] === invId && r[c.is_spare] !== 't' && r[c.is_spare] !== 'True'
);
const byColor = new Map();
for (const r of parts.rows) {
	const hex = hexOf.get(r[parts.col.color_id]) ?? 'AAAAAA';
	byColor.set(hex, (byColor.get(hex) ?? 0) + Number(r[parts.col.quantity]));
}

const data = {
	set: setNum,
	name: set[sc.name],
	year: Number(set[sc.year]),
	numParts: Number(set[sc.num_parts]),
	// Sorted descending so consumers can treat the head as the dominant
	// palette without re-sorting.
	colors: [...byColor.entries()].sort((a, b) => b[1] - a[1]).map(([hex, n]) => ({ hex, n }))
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../src/lib/data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${slug}.json`);
writeFileSync(outPath, JSON.stringify(data, null, '\t') + '\n');

const counted = data.colors.reduce((s, c) => s + c.n, 0);
console.log(`${data.name} (${data.set}, ${data.year})`);
console.log(`num_parts=${data.numParts}, counted=${counted}, colors=${data.colors.length}`);
console.log(`wrote ${outPath}`);
