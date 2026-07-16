import { loadSettings, saveSettings, type Settings, type Shortcut } from './settings';

class SettingsStore {
	current = $state<Settings>(loadSettings());

	get configured(): boolean {
		return this.current.username.trim().length > 0;
	}

	save() {
		saveSettings(this.current);
	}

	setGitHub(username: string, token: string, repos: string[]) {
		this.current.username = username.trim();
		this.current.token = token.trim();
		this.current.repos = repos;
		this.save();
	}

	addShortcut(label: string, url: string) {
		this.current.shortcuts.push({ id: crypto.randomUUID(), label, url });
		this.save();
	}

	removeShortcut(id: string) {
		this.current.shortcuts = this.current.shortcuts.filter((s: Shortcut) => s.id !== id);
		this.save();
	}

	setWeather(enabled: boolean, latitude: number | null, longitude: number | null, place: string) {
		this.current.weather = { enabled, latitude, longitude, place };
		this.save();
	}
}

export const settings = new SettingsStore();
