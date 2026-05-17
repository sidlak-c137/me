// Routes carry no per-request data, so SvelteKit can emit static HTML at
// build time instead of running the renderer on every request.
export const prerender = true;
