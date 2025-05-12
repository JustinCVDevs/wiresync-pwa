<script lang="ts">
	import { goto } from '$app/navigation';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import LoginForm from './LoginForm.svelte';

	import type { Writable } from 'svelte/store';
	export let lastSyncTime: Writable<Date | null>;

	$: syncTimeDisplay = $lastSyncTime
		? `Last sync: ${$lastSyncTime.toLocaleTimeString()}`
		: 'Never synced';

	$: isAuthenticated = pocketbaseService.isAuthenticated;
	let showLoginForm = false;

	// Update online status based on network connectivity
	let online = true;
	let status = 'Online';

	function updateOnlineStatus() {
		online = navigator.onLine;
		status = online ? 'Online' : 'Offline';
	}

	// Add event listeners for online/offline status
	if (typeof window !== 'undefined') {
		window.addEventListener('online', updateOnlineStatus);
		window.addEventListener('offline', updateOnlineStatus);
	}

	function handleLogout() {
		pocketbaseService.logout();
		goto('/');
	}
</script>

<div class="flex items-center justify-between rounded-t-lg bg-gray-800 p-4">
	<div class="flex items-center">
		<div class="mr-2 rounded bg-white p-1">
			<div class="text-xl font-bold text-gray-800">MMS</div>
		</div>
	</div>
	<div class="flex flex-1 justify-between">
		<div class="mr-2 text-sm text-white">
			<span>User: {pocketbaseService.currentUser?.name}</span>
			<div class="flex items-center">
				<span
					class="mr-1 inline-block h-2 w-2 rounded-full {online ? 'bg-green-500' : 'bg-red-500'}"
				></span>
				<span class="text-xs">{online ? 'Online' : 'Offline'}</span>
			</div>
			<div class="text-xs">Synced at {syncTimeDisplay}</div>
		</div>
		<button
			class="rounded bg-gray-700 px-2 py-1 text-xs text-white transition duration-200 hover:bg-gray-600"
			on:click={handleLogout}
		>
			Log Out
		</button>
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";
	.sync-indicator {
		font-size: 0.625rem;
		color: #ff4444;
	}

	.online-status {
		@apply bg-red-500;
		&.Online {
			@apply bg-green-500;
		}
	}
	.sync-indicator.Online {
		color: #44ff44;
	}
</style>
