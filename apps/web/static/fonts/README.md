# Local font files

Place the self-hosted `.woff2` files in this folder using these paths:

- `alegreya/alegreya-variable.woff2`
- `alegreya/alegreya-italic-variable.woff2`
- `alegreya-sc/alegreya-sc-400.woff2`
- `alegreya-sc/alegreya-sc-700.woff2`
- `lato/lato-300.woff2`
- `lato/lato-400.woff2`
- `lato/lato-700.woff2`
- `lato/lato-900.woff2`
- `jetbrains-mono/jetbrains-mono-400.woff2`
- `jetbrains-mono/jetbrains-mono-500.woff2`
- `jetbrains-mono/jetbrains-mono-700.woff2`

SvelteKit serves files in `apps/web/static` from the site root, so for example:

- `apps/web/static/fonts/lato/lato-400.woff2`
- `/fonts/lato/lato-400.woff2` in CSS/HTML

The app uses `font-display: block` for these files to avoid a visible fallback-to-webfont
swap on refresh.