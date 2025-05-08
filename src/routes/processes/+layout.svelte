<script lang="ts">
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import { Toaster } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { syncService } from '$lib/services/syncService';
	import { writable } from 'svelte/store';
	import '../../app.scss';

	let { children } = $props();
	const message = $derived($page.url.searchParams.get('error'));
	const lastSyncTime = writable<Date | null>(null);

	async function syncData() {
		if (navigator.onLine) {
			try {
				await Promise.all([
					syncService.syncTruckList(),
					syncService.syncTrainList(),
					syncService.syncConsignmentList(),
					syncService.syncAllPending()
				]);
				lastSyncTime.set(new Date());
			} catch (error) {
				console.warn('Sync failed:', error);
			}
		}
	}

	onMount(() => {
		syncData();
		const syncInterval = setInterval(syncData, 30000);
		return () => clearInterval(syncInterval);
	});
</script>

<Header {lastSyncTime} />
{#if message != null}
    <Toaster title={message} />
{/if}
{@render children()}
