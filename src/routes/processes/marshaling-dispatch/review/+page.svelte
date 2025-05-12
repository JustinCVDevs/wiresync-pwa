<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train, Consignment } from '$lib/types';
	import type { TrainDispatch } from '$lib/types/trainDispatch';

	let dispatchId = $page.url.searchParams.get('dispatchId') || '';
	let trainDispatch: TrainDispatch | undefined;
	let train: Train | undefined;
	let consignment: Consignment | undefined;
	let error = '';
	let isLoading = true;

	async function loadData() {
		try {
			// Load train dispatch
			const dispatch = await indexedDBService.getRecord('trainDispatches', dispatchId);
			if (!dispatch) {
				error = 'Train dispatch not found';
				return;
			}
			trainDispatch = dispatch;

			// Load train details
			const trainData = await indexedDBService.getRecord('trains', trainDispatch.linkedTrainId);
			train = trainData;

			// Load consignment if exists
			if (trainDispatch.linkedConsignmentId) {
				const consignmentData = await indexedDBService.getRecord(
					'consignments',
					trainDispatch.linkedConsignmentId
				);
				consignment = consignmentData;
			}
		} catch (err) {
			error = 'Failed to load data';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	function handleAddWagons() {
		goto(`/processes/marshaling-dispatch/wagon-linkage?dispatchId=${dispatchId}`);
	}

	function handleComplete() {
		// TODO: Implement completion logic
		goto('/processes');
	}

	$: if (dispatchId) {
		loadData();
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg dark:text-gray-800">
	<h1 class="mb-6 text-center text-2xl font-bold">Review Dispatch Details</h1>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else if train}
		<div class="space-y-6">
			<div class="space-y-4 rounded-lg border p-4">
				<div>
					<h2 class="text-lg font-semibold">Train Details</h2>
					<p>Reference: {train.refNr}</p>
					{#if train.rfidNr}
						<p>RFID: {train.rfidNr}</p>
					{/if}
				</div>

				{#if consignment}
					<div>
						<h2 class="text-lg font-semibold">Consignment Details</h2>
						<p>Number: {consignment.name}</p>
					</div>
				{/if}

				<div>
					<h2 class="text-lg font-semibold">Linked Wagons</h2>
					{#if trainDispatch?.linkedWagonIds?.length}
						<ul class="list-disc pl-5">
							{#each trainDispatch.linkedWagonIds as wagonId}
								<li>{wagonId}</li>
							{/each}
						</ul>
					{:else}
						<p class="text-gray-500">No wagons linked yet</p>
					{/if}
				</div>
			</div>

			<div class="flex space-x-4">
				<button
					class="flex-1 rounded-md bg-blue-600 py-3 text-white hover:bg-blue-700"
					on:click={handleAddWagons}
				>
					Add Wagons
				</button>
				<button
					class="flex-1 rounded-md bg-green-600 py-3 text-white hover:bg-green-700"
					on:click={handleComplete}
				>
					Complete
				</button>
			</div>
		</div>
	{/if}
</div>
