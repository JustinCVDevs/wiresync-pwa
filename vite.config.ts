import tailwindcss from '@tailwindcss/vite';
import replace from '@rollup/plugin-replace';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaConfiguration, replaceOptions} from './pwa-configuration.js';
export default defineConfig({
	server: {
		allowedHosts: ["73a2-102-182-162-69.ngrok-free.app"],
		port: 5173
	},
	plugins: [tailwindcss(), sveltekit(),VitePWA(pwaConfiguration), replace(replaceOptions)
	]
});
