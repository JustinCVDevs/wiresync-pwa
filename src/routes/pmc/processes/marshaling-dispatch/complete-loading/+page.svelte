<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TrainDispatch, WagonLink } from '$lib/types';

	const dispatchId = $page.url.searchParams.get('dispatchId') || '';
	let dispatchRecord: TrainDispatch | undefined;
	let wagons: WagonLink[] = [];
	let error = '';
	let isLoading = true;

	onMount(async () => {
		if (dispatchId) {
			dispatchRecord = await indexedDBService.getRecord('trainDispatches', dispatchId);
			const wagonRecords = await indexedDBService.getRecords('wagonLinks', (record) => record.linkedDispatchId === dispatchId);
			wagons = wagonRecords;
		}
		isLoading = false;
	});

	async function handleComplete() {
		if (!dispatchRecord) return;

		try {
			await indexedDBService.updateRecord('trainDispatches', dispatchRecord.id, {
				...dispatchRecord,
				syncStatus: 'ready',
				updated: new Date().toISOString()
			});
			goto(`/pmc/processes/marshaling-dispatch/review?dispatchId=${dispatchId}`);
		} catch (err) {
			error = 'Failed to complete loading process';
		}
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg">
	<h1 class="mb-6 text-center text-2xl font-bold">Complete Loading</h1>

	{#if isLoading}
		<div class="text-center">Loading dispatch details...</div>
	{:else if dispatchRecord}
		<div class="space-y-6">
			<div class="rounded border p-4">
				<h2 class="mb-2 text-lg font-semibold">Linked Wagons ({wagons.length})</h2>
				{#each wagons as wagon}
					<div class="mb-2 rounded border p-2 text-sm">
						<span class="font-mono">{wagon.rfid}</span>
						<span class="text-gray-500">
							({new Date(wagon.timestamp).toLocaleTimeString()})
						</span>
					</div>
				{/each}
			</div>

			<button
				on:click={handleComplete}
				class="w-full rounded-md bg-green-600 py-3 text-white hover:bg-green-700"
			>
				Complete Loading Process
			</button>
		</div>
	{/if}
</div>