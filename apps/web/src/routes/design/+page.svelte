<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Input, Link, useTheme } from '@me/design-system';

	const theme = useTheme();

	const sections = [
		{ no: '01', id: 'color', label: 'Color' },
		{ no: '02', id: 'typography', label: 'Typography' },
		{ no: '03', id: 'primitives', label: 'Primitives' }
	];

	const paper = [
		{ step: 50, oklch: 'oklch(99% 0.005 78)' },
		{ step: 100, oklch: 'oklch(97% 0.008 78)' },
		{ step: 200, oklch: 'oklch(93% 0.012 78)' },
		{ step: 300, oklch: 'oklch(87% 0.015 78)' },
		{ step: 400, oklch: 'oklch(72% 0.018 78)' },
		{ step: 500, oklch: 'oklch(56% 0.018 78)' },
		{ step: 600, oklch: 'oklch(45% 0.016 78)' },
		{ step: 700, oklch: 'oklch(35% 0.014 78)' },
		{ step: 800, oklch: 'oklch(25% 0.012 78)' },
		{ step: 900, oklch: 'oklch(18% 0.010 78)' },
		{ step: 950, oklch: 'oklch(12% 0.008 78)' }
	];

	const sage = [
		{ step: 50, oklch: 'oklch(97% 0.015 145)' },
		{ step: 100, oklch: 'oklch(94% 0.030 145)' },
		{ step: 200, oklch: 'oklch(88% 0.050 145)' },
		{ step: 300, oklch: 'oklch(80% 0.075 145)' },
		{ step: 400, oklch: 'oklch(70% 0.090 145)' },
		{ step: 500, oklch: 'oklch(58% 0.100 145)' },
		{ step: 600, oklch: 'oklch(48% 0.105 145)' },
		{ step: 700, oklch: 'oklch(40% 0.090 145)' },
		{ step: 800, oklch: 'oklch(32% 0.075 145)' },
		{ step: 900, oklch: 'oklch(24% 0.055 145)' },
		{ step: 950, oklch: 'oklch(16% 0.040 145)' }
	];

	const semantic = [
		{ name: 'background', usage: 'page surface' },
		{ name: 'foreground', usage: 'primary text' },
		{ name: 'surface', usage: 'cards, raised panels' },
		{ name: 'muted', usage: 'subtle fills' },
		{ name: 'muted-foreground', usage: 'secondary text' },
		{ name: 'border', usage: 'dividers, hairlines' },
		{ name: 'accent', usage: 'links, primary action' },
		{ name: 'accent-muted', usage: 'accent backgrounds' }
	];

	const typeRows = [
		{
			name: 'display',
			meta: 'Alegreya · italic · 6xl/7xl',
			cls: 'font-serif italic text-6xl md:text-7xl leading-[0.95]',
			text: 'Foundations.'
		},
		{
			name: 'h1',
			meta: 'Alegreya · 4xl/5xl',
			cls: 'font-serif text-4xl md:text-5xl leading-tight',
			text: 'A working library.'
		},
		{
			name: 'h2',
			meta: 'Alegreya · italic · 3xl/4xl',
			cls: 'font-serif italic text-3xl md:text-4xl leading-tight',
			text: 'Tokens, type, primitives.'
		},
		{
			name: 'h3',
			meta: 'Lato · bold · xl/2xl',
			cls: 'font-sans font-bold text-xl md:text-2xl',
			text: 'Section heading.'
		},
		{
			name: 'lead',
			meta: 'Lato · lg · relaxed',
			cls: 'font-sans text-lg leading-relaxed text-muted-foreground',
			text: 'A larger paragraph for the opening of an article or section.'
		},
		{
			name: 'body',
			meta: 'Lato · base · relaxed',
			cls: 'font-sans text-base leading-relaxed',
			text: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.'
		},
		{
			name: 'small',
			meta: 'Lato · sm · muted',
			cls: 'font-sans text-sm text-muted-foreground',
			text: 'Captions, metadata, footnotes.'
		},
		{
			name: 'mono',
			meta: 'JetBrains Mono · sm',
			cls: 'font-mono text-sm',
			text: 'const designed = true;'
		}
	];

	let email = $state('');
</script>

<svelte:head>
	<title>Design — Sid Lakshmanan</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<nav class="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-sm">
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
			<a
				href={resolve('/')}
				data-cursor="text"
				class="font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase transition-colors hover:text-foreground"
			>
				← Sid Lakshmanan
			</a>
			<div class="flex items-center gap-3">
				<span
					class="hidden font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase sm:inline"
				>
					/design · v0.1
				</span>
				<button
					onclick={theme.toggle}
					data-cursor="hover"
					class="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 font-mono text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
					aria-label="Toggle color theme"
				>
					<!-- CSS-gated label keeps SSR and client markup identical;
					     reading reactive theme state pre-mount caused hydration
					     mismatches. -->
					<span aria-hidden="true" class="dark:hidden">☾</span>
					<span aria-hidden="true" class="hidden dark:inline">☀</span>
					<span class="dark:hidden">dark</span>
					<span class="hidden dark:inline">light</span>
				</button>
			</div>
		</div>
	</nav>

	<header class="mx-auto max-w-5xl px-6 pt-20 pb-16 md:pt-28 md:pb-20">
		<p class="font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
			Design system · 2025
		</p>
		<h1 class="mt-5 max-w-3xl font-serif text-6xl leading-[0.95] italic md:text-7xl">
			Foundations.
		</h1>
		<p class="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
			A working library of tokens, type, and primitives. Documented in plain view so the system
			stays honest — and doubles as a sandbox for the pieces that ship into everything else.
		</p>

		<div class="mt-12 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-border pt-6 sm:grid-cols-5">
			{#each sections as s (s.id)}
				<a
					href="#{s.id}"
					data-cursor="text"
					class="inline-flex items-baseline gap-2 justify-self-start font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
				>
					<span class="text-subtle">{s.no}</span>
					<span>{s.label}</span>
				</a>
			{/each}
		</div>
	</header>

	<main class="mx-auto max-w-5xl space-y-24 px-6 pb-32">
		<!-- ─── Color ───────────────────────────────────────────── -->
		<section id="color" class="scroll-mt-24">
			<header class="mb-10 border-b border-border pb-4">
				<div class="flex items-baseline justify-between gap-6">
					<h2 class="font-serif text-3xl md:text-4xl">Color</h2>
					<span class="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						01 / Color
					</span>
				</div>
				<p class="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
					Two ramps and a small set of semantic aliases. Paper carries the page; sage handles
					accents, focus, and selection. Defined in OKLCH so light and dark trade fairly.
				</p>
			</header>

			<h3 class="mb-4 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
				Semantic
			</h3>
			<div class="mb-14 grid grid-cols-2 gap-3 md:grid-cols-4">
				{#each semantic as token (token.name)}
					<div class="overflow-hidden rounded-md border border-border bg-surface">
						<div
							class="h-16 border-b border-border"
							style="background-color: var(--{token.name})"
						></div>
						<div class="px-3 py-2.5">
							<p class="font-mono text-xs text-foreground">--{token.name}</p>
							<p class="mt-1 text-xs text-muted-foreground">{token.usage}</p>
						</div>
					</div>
				{/each}
			</div>

			<div class="mb-4 flex items-baseline justify-between">
				<h3 class="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
					Paper · neutral
				</h3>
				<p class="font-mono text-[0.7rem] text-subtle">hue 78 · warm cream</p>
			</div>
			<div class="mb-12 grid grid-cols-11 gap-1">
				{#each paper as p (p.step)}
					<div class="text-[10px]">
						<div
							class="aspect-square rounded-sm border border-border"
							style="background-color: {p.oklch}"
							title={p.oklch}
						></div>
						<p class="mt-2 font-mono text-muted-foreground">{p.step}</p>
					</div>
				{/each}
			</div>

			<div class="mb-4 flex items-baseline justify-between">
				<h3 class="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
					Sage · accent
				</h3>
				<p class="font-mono text-[0.7rem] text-subtle">hue 145 · muted herbal</p>
			</div>
			<div class="grid grid-cols-11 gap-1">
				{#each sage as e (e.step)}
					<div class="text-[10px]">
						<div
							class="aspect-square rounded-sm border border-border"
							style="background-color: {e.oklch}"
							title={e.oklch}
						></div>
						<p class="mt-2 font-mono text-muted-foreground">{e.step}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- ─── Typography ───────────────────────────────────────── -->
		<section id="typography" class="scroll-mt-24">
			<header class="mb-10 border-b border-border pb-4">
				<div class="flex items-baseline justify-between gap-6">
					<h2 class="font-serif text-3xl md:text-4xl">Typography</h2>
					<span class="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						02 / Typography
					</span>
				</div>
				<p class="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
					A serif for voice, a sans for clarity, a mono for the seams. Italic Alegreya does the
					heavy lifting at display sizes.
				</p>
			</header>

			<div class="mb-14 grid gap-10 md:grid-cols-3">
				<div class="space-y-3 border-t border-border pt-6">
					<p class="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						Serif · display
					</p>
					<p class="font-serif text-5xl leading-none">Alegreya</p>
					<p class="font-serif text-sm text-muted-foreground">
						Juan Pablo del Peral, 2011. Display and long-form.
						<em>Italic carries weight.</em>
					</p>
				</div>
				<div class="space-y-3 border-t border-border pt-6">
					<p class="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						Sans · interface
					</p>
					<p class="font-sans text-5xl leading-none">Lato</p>
					<p class="font-sans text-sm text-muted-foreground">
						Łukasz Dziedzic, 2010. UI, body, and everything in between.
					</p>
				</div>
				<div class="space-y-3 border-t border-border pt-6">
					<p class="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						Mono · detail
					</p>
					<p class="font-mono text-5xl leading-none">JetBrains</p>
					<p class="font-mono text-sm text-muted-foreground">
						Code, labels, metadata, eyebrow text.
					</p>
				</div>
			</div>

			<div class="space-y-2">
				{#each typeRows as row (row.name)}
					<div
						class="grid grid-cols-1 items-baseline gap-3 border-t border-border py-6 md:grid-cols-[12rem_1fr] md:gap-8"
					>
						<div>
							<p class="font-mono text-xs tracking-[0.18em] uppercase">
								{row.name}
							</p>
							<p class="mt-1 font-mono text-[0.7rem] text-muted-foreground">
								{row.meta}
							</p>
						</div>
						<p class={row.cls}>{row.text}</p>
					</div>
				{/each}
			</div>

			<div class="mt-12">
				<p class="mb-4 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
					Weights
				</p>
				<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
					{#each [{ w: 300, name: 'Light' }, { w: 400, name: 'Regular' }, { w: 700, name: 'Bold' }, { w: 900, name: 'Black' }] as wt (wt.w)}
						<div class="border-t border-border pt-3">
							<p class="font-serif text-3xl" style="font-weight: {wt.w}">Aa</p>
							<p class="mt-2 font-mono text-[0.7rem] text-muted-foreground">
								{wt.name} · {wt.w}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ─── Primitives ───────────────────────────────────────── -->
		<section id="primitives" class="scroll-mt-24">
			<header class="mb-10 border-b border-border pb-4">
				<div class="flex items-baseline justify-between gap-6">
					<h2 class="font-serif text-3xl md:text-4xl">Primitives</h2>
					<span class="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						03 / Primitives
					</span>
				</div>
				<p class="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
					Composable building blocks living in
					<code class="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.72rem]">
						@me/design-system
					</code>. Each one wraps a single native element so the system stays predictable.
				</p>
			</header>

			<div class="space-y-14">
				<div>
					<p class="mb-5 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						Button · variants
					</p>
					<div class="flex flex-wrap items-center gap-3">
						<Button variant="primary">Primary</Button>
						<Button variant="accent">Accent</Button>
						<Button variant="secondary">Secondary</Button>
						<Button variant="ghost">Ghost</Button>
						<Link href="#">Link →</Link>
					</div>
					<div class="mt-5 flex flex-wrap items-center gap-3">
						<Button variant="primary" disabled>Disabled</Button>
						<Button variant="secondary">
							<span aria-hidden="true">↗</span>
							With icon
						</Button>
					</div>
				</div>

				<div>
					<p class="mb-5 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						Input
					</p>
					<div class="grid gap-6 md:grid-cols-2">
						<div class="flex flex-col gap-2">
							<label
								for="email"
								class="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase"
							>
								Email
							</label>
							<Input id="email" type="email" placeholder="hello@example.com" bind:value={email} />
							<p class="font-mono text-[0.7rem] text-subtle">Used for newsletter sign-up.</p>
						</div>
						<div class="flex flex-col gap-2">
							<label
								for="locked"
								class="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase"
							>
								Locked
							</label>
							<Input
								id="locked"
								value="read-only@ field"
								disabled
								class="cursor-not-allowed opacity-60"
							/>
							<p class="font-mono text-[0.7rem] text-subtle">Disabled state.</p>
						</div>
					</div>
				</div>

				<div>
					<p class="mb-5 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
						Link
					</p>
					<p class="max-w-xl text-base leading-relaxed">
						Inline links flow with the surrounding copy — like
						<Link href={resolve('/')}>this one back to the index</Link> — and pick up the accent on hover.
					</p>
				</div>
			</div>
		</section>

		<footer class="border-t border-border pt-10 pb-4">
			<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<p class="font-mono text-xs text-muted-foreground">
					<span class="text-foreground">/design</span>
					· v0.1 · Alegreya · Lato · JetBrains Mono
				</p>
				<div class="flex items-center gap-5 font-mono text-xs">
					<a
						href="#color"
						data-cursor="text"
						class="text-muted-foreground transition-colors hover:text-foreground"
					>
						Top
					</a>
					<a
						href={resolve('/')}
						data-cursor="text"
						class="text-muted-foreground transition-colors hover:text-foreground"
					>
						Home
					</a>
					<span class="text-subtle">© {new Date().getFullYear()}</span>
				</div>
			</div>
		</footer>
	</main>
</div>
