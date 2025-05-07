import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess({ preprocess: ['@tailwindcss'] }),
	kit: { adapter: adapter() }
};

export default config;
