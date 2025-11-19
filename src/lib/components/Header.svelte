<script lang="ts">
	import { goto } from '$app/navigation';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
    import { onMount, onDestroy } from 'svelte';
	import type { Writable } from 'svelte/store';
	export let lastSyncTime: Writable<Date | null>;

	$: syncTimeDisplay = $lastSyncTime
		? ` ${$lastSyncTime.toLocaleTimeString()}`
		: 'false';

	$: isAuthenticated = pocketbaseService.isAuthenticated;
	let showLoginForm = false;


    // Online status, only set in browser
    let online = true;
    let status = 'Online';

    onMount(() => {
        function updateOnlineStatus() {
            online = navigator.onLine;
            status = online ? 'Online' : 'Offline';
        }
        updateOnlineStatus();
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        // Clean up listeners on destroy
        onDestroy(() => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        });
    });

	function handleLogout() {
		pocketbaseService.logout();
		goto('/');
	}

</script>

<header class="flex items-center justify-between rounded-t-lg bg-gray p-4 mb-4">
    <div class="flex items-center">
        <div class="mr-2 rounded bg-white p-1">
            <img src="/icons/logo-512.png" alt="Wire Sync Logo" class=" inline-block h-16 w-16" />
        </div>
    </div>
    <div class="flex flex-1 justify-between">
        <div class="mr-2 text-sm text-white">
            <span>User: {pocketbaseService.currentUser?.name}</span>
            <div class="flex items-center">
                <span
                    class="mr-1 inline-block h-2 w-2 rounded-full sync-indicator {online ? "Online": "Offline"}"
                ></span>
                <span class="text-xs">{online ? 'Online' : 'Offline'}</span>
            </div>
            {#if syncTimeDisplay !== 'false'}
            <div class="text-xs">Synced: {syncTimeDisplay}</div>
            {/if}
        </div>
        <div class="flex flex-col items-end">
            <img 
                src="/HBIS_PMC_logo_full_colour.jpg" 
                alt="PMC Logo" 
                class="mb-2 h-10 w-auto object-contain"
                style="max-width:100px;"
            />
            <button
                class="rounded  px-2 py-1 text-xs text-white transition duration-200 hover:bg-gray-600"
                on:click={handleLogout}
            >
                Log Out
            </button>
        </div>
    </div>
</header>

<style lang="postcss">
    @reference "tailwindcss";
    .sync-indicator {
        font-size: 0.625rem;
        background: var(--red);
    }

    .sync-indicator.Online {
        background:  var(--green);
    }
</style>
