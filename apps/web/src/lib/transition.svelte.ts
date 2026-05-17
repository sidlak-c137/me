import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { resolve } from '$app/paths';
import type { Pathname } from '$app/types';

// Shared driver for the cross-page wash transition. Lives outside any
// component so the same instance is observed by the root layout (which
// renders the overlay) and the page that initiated the navigation.
class PageTransition {
	// Drives the fixed full-bleed panel rendered in the root layout.
	// Kept here rather than on the originating page so the sweep survives
	// the route swap mid-animation.
	active = $state(false);

	// One-shot marker the destination page reads at init to decide
	// whether to play its entrance transitions. Cleared on read so a
	// subsequent refresh on the same route stays static.
	private pendingIntro = false;

	// Total sweep duration; kept in lock-step with the keyframe in
	// +layout.svelte. Handoff is the midpoint — full coverage — and the
	// safest moment to swap routes since the new page mounts hidden.
	readonly duration = 1100;
	readonly handoff = 550;

	navigate(href: Pathname) {
		if (!browser) {
			goto(resolve(href));
			return;
		}
		this.pendingIntro = true;
		this.active = true;
		setTimeout(() => goto(resolve(href)), this.handoff);
		setTimeout(() => (this.active = false), this.duration);
	}

	// Read once: returns true on the first call after a navigate(),
	// false afterwards. Pages call this synchronously during script
	// setup so the result is stable for the lifetime of the instance.
	consumeIntro() {
		if (!this.pendingIntro) return false;
		this.pendingIntro = false;
		return true;
	}
}

export const pageTransition = new PageTransition();
