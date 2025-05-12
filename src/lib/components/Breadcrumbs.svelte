<!-- Breadcrumbs.svelte -->
<script lang="ts">
	import { derived } from 'svelte/store';
	import { page } from '$app/stores';

	// derive array of { name, href } from current path
	const crumbs = derived(page, ($page) => {
		const segments = $page.url.pathname.split('/').filter(Boolean);

		let list = segments.map((seg, i) => {
			const href = '/' + segments.slice(0, i + 1).join('/');
			const name = decodeURIComponent(seg)
				.replace(/[-_]/g, ' ')
				.replace(/\b\w/g, (c) => c.toUpperCase());
			if (name === 'Processes') {
				return { name: 'PMC Processes', href: '/processes' };
			}
			return { name, href };
		});

		if (list.length == 1) {
			list = [];
		}
		return [...list];
	});
</script>

<nav aria-label="Breadcrumb" class="text-center text-sm text-gray-500 mt-4">
	<ol class="flex items-center justify-center space-x-2">
		{#each $crumbs as crumb, i}
			<li class="flex items-center">
				{#if i > 0}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				{/if}
				<a href={crumb.href} class="hover:text-gray-700 ml-2">
					{crumb.name}
				</a>
			</li>
		{/each}
	</ol>
</nav>
