import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(),
	VitePWA({
		registerType: 'autoUpdate',
		workbox: {
			// Precache everything in `build`
			globPatterns: ['**/*.{js,css,html,svg,png}'],
			runtimeCaching: [
				{
					urlPattern: /^\/api\/.*\.(json)$/,
					handler: 'NetworkFirst',
					options: { cacheName: 'api-cache', expiration: { maxEntries: 50 } }
				},
				{
					urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
					handler: 'CacheFirst',
					options: { cacheName: 'image-cache', expiration: { maxEntries: 100, maxAgeSeconds: 604800 } }
				}
			]
		},
		manifest: {
			name: 'WirewSync',
			short_name: 'WireSync',
			description: 'A Svelte PWA with offline support',
			theme_color: '#f1f5f9',
			background_color: '#ffffff',
			display: 'standalone',
			icons: [
				{
					src: '/favicon.png',
					sizes: '192x192',
					type: 'image/png',
					purpose: "any"

				},
				{
					src: '/favicon.png',
					sizes: '512x512',
					type: 'image/png',
					purpose: "any"
				}
			],
			screenshots: [
				{
					src: '/screenshots/app-399x865.png',
					sizes: '399x865',
					type: 'image/png',
					platform: 'narrow'    // tall form factor
				}
			]
		}
	})
	],
	css: {
		preprocessorOptions: {
			scss: {}
		}
	}
});
