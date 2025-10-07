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
					syncService.syncTruckList(),
					syncService.syncTrainList(),
					syncService.syncConsignmentList(),
					syncService.syncAllPending(),
					syncService.deleteLocalDatabase(),
					syncService.syncShuntingTrainList(),
					syncService.syncWagonList()
				]);
				lastSyncTime.set(new Date());
			} catch (error) {
				goto(`/locations?error=Sync failed: Unable to sync`);
				console.warn('Sync failed:', error);
			}
		}
	}

	onMount(() => {
		syncData();
		const syncInterval = setInterval(syncData, 15000);
		return () => clearInterval(syncInterval);
	});
</script>

<Header {lastSyncTime} />
<Breadcrumbs />

{#if message != null}
	<Toaster title={message} />
{/if}
{@render children()}
