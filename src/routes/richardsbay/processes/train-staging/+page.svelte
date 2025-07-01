<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train, TrainDispatch } from '$lib/types';

	let trains: Train[] = [];
	let selectedTrainRef = '';
	let error = '';
	let isLoading = true;

	const steps = ['Train Selection', 'Wagon Details', 'Review & Complete'];
	let currentStep = 1;

	async function loadTrains() {
		try {
			const trainRecords = await indexedDBService.getTrains();
			trains = trainRecords.filter(train => train.syncStatus === 'synced');
		} catch (e) {
			console.error(e);
			error = 'Failed to load trains';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadTrains);

	async function handleSubmit() {
		error = '';
		if (!selectedTrainRef) {
			error = 'Please select a train reference number';
			return;
		}

		try {
			const selectedTrain = trains.find(t => t.refNr === selectedTrainRef);
			if (!selectedTrain) {
				error = 'Selected train not found';
				return;
			}

			// Create a new train dispatch for staging
			const dispatchId = crypto.randomUUID();
			const trainDispatch: TrainDispatch = {
				id: dispatchId,
				linkedTrainId: (selectedTrain.serverId || selectedTrain.id) ?? '',
				linkedWagonIds: [],
				process: 'Train Staging',
				syncStatus: 'pending',
				created: new Date(),
				updated: new Date().toISOString()
			};

			await indexedDBService.saveRecord('trainDispatches', trainDispatch);
			goto(`/richardsbay/processes/train-staging/wagon-details?dispatchId=${dispatchId}`);
		} catch (e: any) {
			console.error(e);
			error = 'Failed to initialize train staging';
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes');
	}
</script>

<ProcessLayout
	title="Train Staging"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/richardsbay/processes"
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Train Selection</h5>
		<p class="text-sm text-gray">
			Please select the train reference number for staging
		</p>
	</div>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading trains...</div>
	{:else}
		<FormField
			label="Train Reference Number"
			id="trainRef"
			isSelect={true}
			placeholder="Select Train Reference Number"
			bind:value={selectedTrainRef}
			options={trains.map((t) => ({ value: t.refNr, label: t.refNr }))}
			required
		/>
	{/if}
</ProcessLayout>