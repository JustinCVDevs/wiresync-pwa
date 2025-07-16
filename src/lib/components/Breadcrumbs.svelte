<!-- Breadcrumbs.svelte -->
<script lang="ts">
    import { derived } from 'svelte/store';
    import { page } from '$app/stores';

    // Helper to truncate a string to a max length, adding ellipsis if needed
    function truncate(str: string, max: number) {
        return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }

    const MAX_TOTAL_LENGTH = 40; // Adjust this for your layout

    const crumbs = derived(page, ($page) => {
        const segments = $page.url.pathname.split('/').filter(Boolean);
        const excludeCrumbs = ['sampling', 'verification', 'fel operation'];

        // Do not show breadcrumbs if "complete" is in the URL
        if (segments.some(seg => decodeURIComponent(seg).toLowerCase() === 'complete')) {
            return [];
        }

        const forceCaps = ['PMC', 'BOP', 'FEL', 'HG', 'LG'];
        const format = (str: string) =>
            str
                .replace(/[-_]/g, ' ')
                .split(' ')
                .map(word =>
                    forceCaps.includes(word.toUpperCase())
                        ? word.toUpperCase()
                        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(' ');

        let list: { name: string; href: string }[] = [];

        if (
            segments.length > 1 &&
            ['pmc', 'bosveld', 'richardsbay'].includes(segments[0].toLowerCase()) &&
            segments[1].toLowerCase() === 'processes'
        ) {
            const location = format(segments[0]);
            list.push({
                name: `${location} Processes`,
                href: '/' + segments.slice(0, 2).join('/')
            });
            for (let i = 2; i < segments.length; i++) {
                const raw = decodeURIComponent(segments[i]).replace(/[-_]/g, ' ').trim();
                if (!excludeCrumbs.includes(raw.toLowerCase())) {
                    const href = '/' + segments.slice(0, i + 1).join('/');
                    list.push({ name: format(raw), href });
                }
            }
        } else {
            list = segments
                .filter(seg => !excludeCrumbs.includes(decodeURIComponent(seg).replace(/[-_]/g, ' ').trim().toLowerCase()))
                .map((seg, i) => {
                    const href = '/' + segments.slice(0, i + 1).join('/');
                    const raw = decodeURIComponent(seg).replace(/[-_]/g, ' ').trim();
                    return { name: format(raw), href };
                });
        }

        return [...list];
    });

    let lastCrumb: { name: string; href: string } | undefined;
    let otherCrumbs: { name: string; href: string }[] = [];
    let available: number = 8;

    $: if ($crumbs.length > 0) {
        lastCrumb = $crumbs[$crumbs.length - 1];
        otherCrumbs = $crumbs.slice(0, -1);
        available = Math.max(8, Math.floor((MAX_TOTAL_LENGTH - lastCrumb.name.length) / otherCrumbs.length));
    }
</script>

{#if $crumbs.length > 0}
	<nav aria-label="Breadcrumb" class="text-center text-xs text-gray mb-4">
		<ol class="flex items-center justify-center space-x-2 whitespace-nowrap min-w-0 px-2" style="max-width:100vw;">
			{#each $crumbs as crumb, i (crumb.href)}
				<li class="flex items-center min-w-0">
					{#if i > 0}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4 text-gray-400 flex-shrink-0"
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
					{#if i === $crumbs.length - 1}
						<!-- Last crumb: always full -->
						<a href={crumb.href} class="hover:text-gray ml-2 block font-semibold" title={crumb.name}>
							{crumb.name}
						</a>
					{:else}
						<a href={crumb.href} class="hover:text-gray ml-2 block" title={crumb.name}>
							{truncate(crumb.name, available)}
						</a>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}