<!-- Breadcrumbs.svelte -->
<script lang="ts">
    import { derived } from 'svelte/store';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';

    // Helper to truncate a string to a max length, adding ellipsis if needed
    function truncate(str: string, max: number) {
        return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }

    const MAX_TOTAL_LENGTH = 40;

    const crumbs = derived(page, ($page) => {
        const segments = $page.url.pathname.split('/').filter(Boolean);
        const excludeCrumbs = ['sampling', 'verification', 'fel operations', 'locations', 'wagons', 'wagon linkage', 'wagon id linking'];

        const idPattern = /^[a-zA-Z0-9]{10,}$/;

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
                if (!excludeCrumbs.includes(raw.toLowerCase()) && !idPattern.test(raw)) {
                    const href = '/' + segments.slice(0, i + 1).join('/');
                    list.push({ name: format(raw), href });
                }
            }
        } else {
            list = segments
                .filter(seg => {
                    const raw = decodeURIComponent(seg).replace(/[-_]/g, ' ').trim();
                    return !excludeCrumbs.includes(raw.toLowerCase()) && !idPattern.test(raw);
                })
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
        available = $crumbs.length > 1
            ? Math.max(8, Math.floor((containerWidth - (lastCrumb?.name.length ?? 0) * 8) / otherCrumbs.length / 8))
            : 40;
    }

    let containerWidth = 0;
    let olRef: HTMLUListElement;

    onMount(() => {
        // Set initial width
        if (olRef) containerWidth = olRef.offsetWidth;
        // Update on resize
        const resize = () => {
            if (olRef) containerWidth = olRef.offsetWidth;
        };
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    });
</script>

{#if $crumbs.length > 0}
    <nav aria-label="Breadcrumb" class="text-center text-xs text-gray mb-4">
        <ol bind:this={olRef} class="flex items-center justify-center space-x-2 whitespace-nowrap min-w-0 px-2 overflow-x-hidden" style="max-width:100vw;">
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
                    {#if $crumbs.length > 3 && i === 0}
                        <!-- Replace first crumb with ... -->
                        <span class="ml-2 block">...</span>
                    {:else if i === $crumbs.length - 1}
                        <!-- Last crumb: always full -->
                        <a href={crumb.href} class="hover:text-gray ml-2 block font-semibold" title={crumb.name}>
                            {crumb.name}
                        </a>
                    {:else}
                        <!-- Other crumbs: scaled truncation -->
                        <a href={crumb.href} class="hover:text-gray ml-2 block" title={crumb.name}>
                            {truncate(crumb.name, Math.max(8, Math.floor(available * 0.8)))}
                        </a>
                    {/if}
                </li>
            {/each}
        </ol>
    </nav>
{/if}