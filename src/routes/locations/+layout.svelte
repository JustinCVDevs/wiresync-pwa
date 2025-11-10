<script lang="ts">
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import { Toaster } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { syncService } from '$lib/services/syncService';
	import { writable } from 'svelte/store';

	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { goto } from '$app/navigation';

	let { children } = $props();
	const message = $derived($page.url.searchParams.get('error'));
	const lastSyncTime = writable<Date | null>(null);

	async function syncData() {
		console.log('Syncing Data');
		if (navigator.onLine) {
			try {
				await Promise.all([
					syncService.syncAllPending(),
				]);
				lastSyncTime.set(new Date());
			} catch (error) {
				goto(`/locations?error=Sync failed: Unable to sync`);
				console.warn('Sync failed:', error);
			}
		}
	}

	async function deleteDatabase() {
		try {
			await syncService.deleteLocalDatabase();
			console.log('Local database deleted successfully.');
		} catch (error) {
			console.error('Error deleting local database:', error);
		}
	}


	function hasRunDeleteToday() {
		const lastRun = localStorage.getItem('lastDeleteRun');
		if (!lastRun) return false;
		const lastDate = new Date(lastRun);
		const now = new Date();
		return lastDate.getFullYear() === now.getFullYear() &&
			lastDate.getMonth() === now.getMonth() &&
			lastDate.getDate() === now.getDate();
	}

	function setDeleteRunToday() {
		localStorage.setItem('lastDeleteRun', new Date().toISOString());
	}

	async function syncAndMaybeDelete() {
		await syncData();
		if (!hasRunDeleteToday()) {
			await deleteDatabase();
			setDeleteRunToday();
		}
	}

	onMount(() => {
		// Run on mount if online
		if (navigator.onLine) {
			syncAndMaybeDelete();
		}
		const syncInterval = setInterval(syncData, 15000);

		// Listen for going online
		function handleOnline() {
			syncAndMaybeDelete();
		}
		window.addEventListener('online', handleOnline);

		return () => {
			clearInterval(syncInterval);
			window.removeEventListener('online', handleOnline);
		};
	});

</script>

<Header {lastSyncTime} />
<Breadcrumbs />

{#if message != null}
	<Toaster title={message} />
{/if}
{@render children()}
