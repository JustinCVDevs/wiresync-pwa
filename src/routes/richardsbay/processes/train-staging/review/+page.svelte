<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TrainDispatch, Train, Wagon } from '$lib/types';
	import { Container } from 'lucide-svelte';

	let dispatchId = '';
	$: dispatchId = $page.url.searchParams.get('dispatchId') || '';

	let trainDispatch: TrainDispatch | undefined;
	let train: Train | undefined;
	let wagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isLoading = true;

	const steps = ['Train Selection', 'Wagon Details', 'Review & Complete'];
	let currentStep = 3;

	async function loadDispatch() {
		isLoading = true;
		try {
			const record = await indexedDBService.getRecord('trainDispatches', dispatchId);
			if (!record) {
				error = 'Train dispatch not found';
				return;
			}
			trainDispatch = record;

			if (trainDispatch) {
				const trains = await indexedDBService.getTrains();
				train = trains.find(t => t.serverId === trainDispatch?.linkedTrainId || t.id === trainDispatch?.linkedTrainId);

				const allWagons = await indexedDBService.getAllRecords('wagons');
				wagons = allWagons.filter(w => 
					(w.id && trainDispatch?.linkedWagonIds?.includes(w.id)) || 
					(w.serverId && trainDispatch?.linkedWagonIds?.includes(w.serverId))
				);
			}
		} catch (e) {
			console.error(e);
			error = 'Failed to load dispatch data';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (dispatchId) loadDispatch();
	});

	function handleNewWagon() {
		goto(`/richardsbay/processes/train-staging/wagon-details?dispatchId=${dispatchId}`);
	}

	async function handleCompleteLoading() {
		try {
			if (!trainDispatch) return;

			// Mark the dispatch as completed
			await indexedDBService.updateRecord('trainDispatches', dispatchId, {
				...trainDispatch,
				updated: new Date().toISOString(),
				syncStatus: 'pending'
			});

			success = 'Train staging completed successfully';
			setTimeout(() => {
				goto('/richardsbay/processes');
			}, 2000);
		} catch (e) {
			console.error(e);
			error = 'Failed to complete train staging';
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes');
	}
</script>

<ProcessLayout
	title="Train Staging - Review"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/richardsbay/processes"
	on:cancel={handleCancel}
	on:submit={handleCompleteLoading}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Review & Complete</h5>
		<p class="text-sm text-gray">
			Review the entered data and complete the train staging
		</p>
	</div>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
			{success}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else}
		<!-- Train Details -->
		<div class="mb-6 rounded-lg border bg-gray-50 p-4">
			<h2 class="mb-2 text-base font-semibold dark:text-gray">Train Details</h2>
			<p class="text-sm dark:text-gray">Train Ref: <span class="font-bold">{train?.refNr || '-'}</span></p>
			<p class="text-sm dark:text-gray">Train RFID: <span class="font-bold">{train?.rfidNr || '-'}</span></p>
		</div>

		<!-- Linked Wagons -->
		<div class="mb-6">
			<div class="mb-4 flex items-center justify-between">
				<p class="text-sm text-gray">Linked Wagons: <span class="font-bold">{wagons.length}</span></p>
				<button
					class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
					on:click={handleNewWagon}
				>
					+ New Wagon
				</button>
			</div>

			{#if wagons.length > 0}
				<div class="space-y-3">
					{#each wagons as wagon}
						<div class="flex items-center gap-3 rounded bg-white px-3 py-2 shadow-sm">
							<Container size={16} class="inline text-xs" />
							<div class="flex-1">
								<div class="font-medium text-gray">
									<span class="text-sm font-light">Wagon ID:</span> {wagon.wagonIdSimple}
								</div>
								<div class="text-sm text-gray-600">
									<span class="font-light">Sample ID:</span> {wagon.transcoreTag}
								</div>
								<div class="text-xs text-gray-400">
									Verification Date: {wagon.verificationTs 
										? new Date(wagon.verificationTs).toLocaleDateString('en-GB')
										: 'Not set'}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-500">No wagons added yet</p>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-4">
			<button
				class="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-white transition hover:bg-blue-700"
				on:click={handleNewWagon}
			>
				+ New Wagon
			</button>
			<button
				class="flex-1 rounded-lg bg-green-600 px-4 py-3 text-white transition hover:bg-green-700"
				on:click={handleCompleteLoading}
				disabled={wagons.length === 0}
			>
				Complete Loading
			</button>
		</div>
	{/if}
</ProcessLayout>