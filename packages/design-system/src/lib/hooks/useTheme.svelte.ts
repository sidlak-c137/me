export type Theme = 'light' | 'dark';

export type UseThemeOptions = {
	storageKey?: string;
};

export type ThemeController = {
	readonly current: Theme;
	toggle: () => void;
	set: (next: Theme) => void;
	clear: () => void;
};

const DEFAULT_STORAGE_KEY = 'theme';

// Rune-based theme controller. Mirrors the inline script in app.html: the
// stored preference wins, otherwise the OS preference is followed. set() /
// toggle() persist a choice; clear() removes it to opt back into "follow
// system".
export function useTheme(options: UseThemeOptions = {}): ThemeController {
	const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;

	let theme = $state<Theme>('light');

	if (typeof document !== 'undefined') {
		theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	}

	$effect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
	});

	$effect(() => {
		const mq = matchMedia('(prefers-color-scheme: dark)');
		const onChange = (e: MediaQueryListEvent) => {
			try {
				if (localStorage.getItem(storageKey) !== null) return;
			} catch {
				/* storage unavailable — fall through and track the system */
			}
			theme = e.matches ? 'dark' : 'light';
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	function persist(next: Theme) {
		try {
			localStorage.setItem(storageKey, next);
		} catch {
			/* storage unavailable */
		}
	}

	return {
		get current() {
			return theme;
		},
		toggle() {
			const next: Theme = theme === 'light' ? 'dark' : 'light';
			theme = next;
			persist(next);
		},
		set(next: Theme) {
			theme = next;
			persist(next);
		},
		clear() {
			try {
				localStorage.removeItem(storageKey);
			} catch {
				/* storage unavailable */
			}
		}
	};
}
