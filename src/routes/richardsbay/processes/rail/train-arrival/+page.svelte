<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train } from '$lib/types/train';
	import type { TrainArrival } from '$lib/types/trainArrival';

	// Form state
	let trainRefNr = '';
	let isSubmitting = false;
	let currentStep = 1;
	let availableTrains: Train[] = [];

	// Process steps
	const processSteps = ['Train Arrival', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Load available trains from IndexedDB
		try {
			availableTrains = await indexedDBService.getTrains();
		} catch (error) {
			processLayout.setError('Failed to load trains. Please try again.');
		}
	});

	async function handleSubmit() {
		try {
			isSubmitting = true;
			processLayout.setError('');

			// Validate form
			if (!isFormValid()) {
				processLayout.setError('Please fill in all required fields and capture a photo.');
				return;
			}

			// Find the selected train
			const selectedTrain = availableTrains.find(train => train.refNr === trainRefNr);
			if (!selectedTrain) {
				processLayout.setError('Selected train not found. Please try again.');
				return;
			}

			// Create train arrival record
			const trainArrival: TrainArrival = {
				id: crypto.randomUUID(),
				trainId: selectedTrain?.serverId,
				trainRefNr: selectedTrain.refNr,
				trainRfidNr: selectedTrain.rfidNr,
				portRailArrivalTimestamp: new Date().toISOString(),
				status: 'pending',
				created: new Date(),
				updated: new Date().toISOString(),
				syncStatus: 'pending',
				siteLocation: 'Richards Bay'
			};

			// Save to IndexedDB using the generic saveRecord method
			await indexedDBService.saveRecord('trainArrivals', trainArrival);

			// Navigate to verification page
			goto(`/richardsbay/processes/rail/train-arrival/verification?trainRefNr=${encodeURIComponent(trainRefNr)}`);
		} catch (error) {
			console.error('Failed to submit train arrival:', error);
			processLayout.setError('Failed to submit train arrival. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail');
	}

	function isFormValid() {
		return trainRefNr;
	}
</script>

<ProcessLayout
	title="Train Arrival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/rail"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div class="space-y-6">
		<FormField
			label="Train Reference Number"
			id="trainRefNr"
			bind:value={trainRefNr}
			placeholder="Select a Train Reference Number"
			required={true}
			isSelect={true}
			options={availableTrains.map(train => ({
				value: train.refNr,
				label: train.refNr
			}))}
		/>
	</div>
</ProcessLayout>

<style>
	.space-y-6 {
		margin-top: 1.5rem;
	}
</style>