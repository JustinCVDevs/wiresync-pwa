<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TrainDispatch, Train, Wagon } from '$lib/types';

	let dispatchId = '';
	$: dispatchId = $page.url.searchParams.get('dispatchId') || '';

	let trainDispatch: TrainDispatch | undefined;
	let train: Train | undefined;
	let wagonId = '';
	let sampleId = '';
	let error = '';
	let isLoading = true;

	const steps = ['Train Selection', 'Wagon Details', 'Review & Complete'];
	let currentStep = 2;

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

	async function handleSubmit() {
		error = '';
		if (!wagonId.trim()) {
			error = 'Please enter a wagon ID';
			return;
		}
		if (!sampleId.trim()) {
			error = 'Please enter a sample ID';
			return;
		}
		if (!trainDispatch) return;

		try {
			const wagonIndexId = crypto.randomUUID();
			const currentDate = new Date().toISOString();

			const wagonData: Wagon = {
				id: wagonIndexId,
				wagonIdSimple: wagonId,
				transcoreTag: sampleId, // Using transcoreTag for sample ID
				verificationTs: currentDate,
				componentType: 'TRAIN_STAGING',
				linkedTrainId: trainDispatch.linkedTrainId,
				process: 'Train Staging',
				created: new Date(currentDate),
				updated: currentDate,
				syncStatus: 'pending'
			};

			await indexedDBService.saveRecord('wagons', wagonData);

			// Update train dispatch with new wagon
			const updatedIds = [...(trainDispatch.linkedWagonIds || []), wagonIndexId];
			await indexedDBService.updateRecord('trainDispatches', dispatchId, {
				...trainDispatch,
				linkedWagonIds: updatedIds,
				updated: new Date().toISOString()
			});

			goto(`/richardsbay/processes/train-staging/review?dispatchId=${dispatchId}`);
		} catch (e) {
			console.error(e);
			error = 'Failed to save wagon data';
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes');
	}
</script>

<ProcessLayout
	title="Train Staging - Wagon Details"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/richardsbay/processes"
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Wagon Details Entry</h5>
		<p class="text-sm text-gray">
			Enter wagon ID and sample ID for the selected train
		</p>
	</div>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else if train}
		<!-- Train Info -->
		<div class="mb-6 rounded-lg border bg-gray-50 p-4">
			<h2 class="mb-2 text-base font-semibold dark:text-gray">Selected Train</h2>
			<p class="text-sm dark:text-gray">Train Ref: <span class="font-bold">{train.refNr || '-'}</span></p>
			<p class="text-sm dark:text-gray">Train RFID: <span class="font-bold">{train.rfidNr || '-'}</span></p>
		</div>

		<!-- Wagon Input Fields -->
		<div class="space-y-4">
			<FormField
				id="wagonId"
				label="Wagon ID/Number"
				type="text"
				bind:value={wagonId}
				placeholder="Enter Wagon ID"
				required
			/>

			<FormField
				id="sampleId"
				label="Wagon Sample ID (PORT_ARRIVAL_SAMPLE_ID)"
				type="text"
				bind:value={sampleId}
				placeholder="Enter Sample ID"
				required
			/>

			<div class="rounded-lg border bg-blue-50 p-4">
				<p class="text-sm text-blue-800">
					<strong>Verification Date:</strong> {new Date().toLocaleDateString('en-GB')} (automatically set)
				</p>
			</div>
		</div>
	{/if}
</ProcessLayout>