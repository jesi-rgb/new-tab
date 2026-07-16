import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess()
	// The adapter (adapter-node) is configured in vite.config.ts for this template.
};

export default config;
