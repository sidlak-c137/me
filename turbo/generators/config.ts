import type { PlopTypes } from '@turbo/gen';

// Scaffolds a new exploration package and mounts it under
// /explorations/<name> in apps/web. Run with `pnpm new-exploration` (or
// `pnpm turbo gen exploration`). Designed to make adding a new sub-app
// feel like a one-shot CLI step: the same six files, three modify-in-place
// edits, and `pnpm install` reminder, every time.
export default function generator(plop: PlopTypes.NodePlopAPI): void {
	// Turn a kebab-case slug into space-separated lowercase ("paper-planes" →
	// "paper planes") for the eyebrow text on the placeholder component.
	// Plop's built-in helpers cover PascalCase / titleCase but not this
	// lowercase-with-spaces variant.
	plop.setHelper('words', (str: unknown) => String(str).replace(/-/g, ' '));

	plop.setGenerator('exploration', {
		description:
			'Scaffold a new exploration package and mount it under /explorations/<name>',
		prompts: [
			{
				type: 'input',
				name: 'name',
				message:
					'Package name (kebab-case, e.g. kaleidoscope or paper-planes):',
				validate: (input: string) => {
					if (!/^[a-z][a-z0-9-]*$/.test(input)) {
						return 'Name must be lowercase kebab-case (letters, digits, hyphens; starts with a letter).';
					}
					return true;
				}
			}
		],
		actions: [
			// ── Scaffold the new package ──────────────────────────────────
			{
				type: 'add',
				path: 'packages/{{name}}/package.json',
				templateFile: 'templates/package/package.json.hbs'
			},
			{
				type: 'add',
				path: 'packages/{{name}}/svelte.config.js',
				templateFile: 'templates/package/svelte.config.js.hbs'
			},
			{
				type: 'add',
				path: 'packages/{{name}}/tsconfig.json',
				templateFile: 'templates/package/tsconfig.json.hbs'
			},
			{
				type: 'add',
				path: 'packages/{{name}}/src/lib/index.ts',
				templateFile: 'templates/package/src/lib/index.ts.hbs'
			},
			{
				type: 'add',
				path: 'packages/{{name}}/src/lib/{{pascalCase name}}.svelte',
				templateFile: 'templates/package/src/lib/component.svelte.hbs'
			},

			// ── Add the route shim in apps/web ────────────────────────────
			{
				type: 'add',
				path: 'apps/web/src/routes/explorations/{{name}}/+page.svelte',
				templateFile: 'templates/route/+page.svelte.hbs'
			},

			// ── Wire the workspace dep into apps/web ──────────────────────
			// Anchored on the `"three":` line, which sits after every `@me/*`
			// entry alphabetically; the new dep is inserted right before it.
			// Breaks gracefully if `three` is ever removed (plop reports
			// "no match") which is preferable to a silent mis-insertion.
			{
				type: 'modify',
				path: 'apps/web/package.json',
				pattern: /(\t\t"three":)/,
				template: '\t\t"@me/{{name}}": "workspace:*",\n$1'
			},

			// ── Register the route in seo.ts ──────────────────────────────
			// Matches the final ROUTES entry (only one followed directly by
			// `\n];`) so the new entry can be appended without trailing-comma
			// drift. The previous last entry picks up a trailing comma in the
			// replacement to keep the array syntactically clean.
			{
				type: 'modify',
				path: 'apps/web/src/lib/seo.ts',
				pattern: /(\t\{ path: '[^']+', changefreq: '[^']+', priority: '[^']+' \})\n(\];)/,
				template:
					"$1,\n\t{ path: '/explorations/{{name}}', changefreq: 'monthly', priority: '0.5' }\n$2"
			},

			// ── Dockerfile: build-stage manifest COPY ─────────────────────
			// Inserts a new `COPY packages/<name>/package.json ...` line just
			// before `RUN pnpm install`, so the cache layer that holds
			// node_modules invalidates only on dep changes (matching the
			// existing per-package pattern).
			{
				type: 'modify',
				path: 'Dockerfile',
				pattern: /(RUN pnpm install --frozen-lockfile)/,
				template:
					'COPY packages/{{name}}/package.json ./packages/{{name}}/\n$1'
			},

			// ── Dockerfile: runtime-stage dist COPY ───────────────────────
			// Anchored on the blank line + EXPOSE so the new package's
			// manifest+dist land in the same block as the existing ones.
			{
				type: 'modify',
				path: 'Dockerfile',
				pattern: /(\nEXPOSE 8080)/,
				template:
					'COPY --from=builder /repo/packages/{{name}}/package.json ./packages/{{name}}/package.json\nCOPY --from=builder /repo/packages/{{name}}/dist ./packages/{{name}}/dist\n$1'
			},

			// ── Final reminder ────────────────────────────────────────────
			() =>
				'Done. Next: run `pnpm install` to wire the new workspace package, then `pnpm dev` and visit /explorations/<name>.'
		]
	});
}
