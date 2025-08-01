<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train } from '$lib/types/train';

	// Form state
	let isSubmitting = false;
	let currentStep = 1;

	let availableTrains: Train[] = [];
	let selectedTrain: any = '';

	// Process steps
	const processSteps = ['Arrival Train', 'Wagon Sampling', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Fetch all train arrivals
		const trainArrivals = (await indexedDBService.getAllRecords('trainArrivals')).filter(
			arrival => arrival.portRailArrivalTimestamp !== '' && arrival.portStagingTimestamp !== '' && arrival.finishSamplingTimestamp === ''
		);

		// Fetch all trains
		const allTrains = (await indexedDBService.getAllRecords('trains'));

		// Filter trains that match the train arrivals' port_arrival_sample_id
		availableTrains = allTrains.filter(train =>
			trainArrivals.some(arrival => arrival.trainId === train.serverId)
		);
	});

	async function handleSubmit() {
		if (!selectedTrain) {
			processLayout.setError('Please select a train arrival ID.');
			return;
		}
		goto(`/richardsbay/processes/rail/train-sampling/wagons?trainRefNr=${selectedTrain}`);
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail');
	}

</script>

<ProcessLayout
	title="Train Sampling"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/rail"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Train Arrival</h5>
	</div>

	<div class="space-y-6">
		<div class="form">
			<FormField
				id="trainArrival"
				label="Train Arrival ID"
				isSelect={true}
				options={availableTrains.map(train => ({ value: train.refNr, label: train.refNr }))}
				bind:value={selectedTrain}
				placeholder="Select Train Arrival ID"
				required
			/>
		</div>
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
