<!-- Breadcrumbs.svelte -->
<script lang="ts">
	import { derived } from 'svelte/store';
	import { page } from '$app/stores';

	// derive array of { name, href } from current path
	const crumbs = derived(page, ($page) => {
		const segments = $page.url.pathname.split('/').filter(Boolean);

		const editIndex = segments.findIndex(seg => decodeURIComponent(seg).toLowerCase() === 'edit');
		let list = segments.map((seg, i) => {
			const href = '/' + segments.slice(0, i + 1).join('/');
			const name = decodeURIComponent(seg)
				.replace(/[-_]/g, ' ')
				.replace(/\b\w/g, (c) => c.toUpperCase());
			
			// Check if this is a 'processes' segment and get the location from previous segment
			if (name === 'Processes' && i > 0) {
				const location = decodeURIComponent(segments[i-1])
					.replace(/[-_]/g, ' ')
					.replace(/\b\w/g, (c) => c.toUpperCase());
				return { name: `${location} Processes`, href };
			}
			return { name, href };
		});

		if (list.length > 2) {
			let filtered = list.slice(1, -1);
			if (editIndex > 1 &&  editIndex < list.length) {
				filtered = filtered.filter((_, i) => i !== editIndex - 2);
			}
			list = filtered;
		}else{
			list = [];
		}
		return [...list];
	});
</script>
{#if $crumbs.length > 0}
<nav aria-label="Breadcrumb" class="text-center text-xs text-gray mb-4">
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
				<a href={crumb.href} class="hover:text-gray ml-2">
					{crumb.name}
				</a>
			</li>
		{/each}
	</ol>
</nav>
{/if}