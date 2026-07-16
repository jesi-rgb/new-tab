import { browser } from '$app/environment';

export type Shortcut = {
	id: string;
	label: string;
	url: string;
};

export type Settings = {
	username: string;
	token: string;
	repos: string[];
	shortcuts: Shortcut[];
	weather: {
		enabled: boolean;
		latitude: number | null;
		longitude: number | null;
		place: string;
	};
};

const STORAGE_KEY = 'new-tab:settings';

export const defaultSettings: Settings = {
	username: '',
	token: '',
	repos: [],
	shortcuts: [
		{ id: crypto.randomUUID(), label: 'GitHub', url: 'https://github.com' }
	],
	weather: {
		enabled: true,
		latitude: null,
		longitude: null,
		place: ''
	}
};

export function loadSettings(): Settings {
	if (!browser) return structuredClone(defaultSettings);
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return structuredClone(defaultSettings);
		const parsed = JSON.parse(raw) as Partial<Settings>;
		return {
			...structuredClone(defaultSettings),
			...parsed,
			weather: { ...defaultSettings.weather, ...(parsed.weather ?? {}) }
		};
	} catch {
		return structuredClone(defaultSettings);
	}
}

export function saveSettings(settings: Settings): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
