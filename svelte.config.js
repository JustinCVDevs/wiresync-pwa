import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess({ preprocess: ['@tailwindcss'] }),
	kit: {
		adapter: adapter({ split: false })
	}
};

export default config;
