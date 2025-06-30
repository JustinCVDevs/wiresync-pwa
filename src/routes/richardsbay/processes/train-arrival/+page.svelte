<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Camera from '$lib/components/Camera.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train } from '$lib/types/train';
	import type { TrainArrival } from '$lib/types/trainArrival';

	// Form state
	let trainRefNr = '';
	let capturedPhoto: File | null = null;
	let isSubmitting = false;
	let currentStep = 1;
	let availableTrains: Train[] = [];

	// Process steps
	const processSteps = ['Train Arrival Details', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Load available trains from IndexedDB
		try {
			availableTrains = await indexedDBService.getTrains();
			console.log('Available trains:', availableTrains);
		} catch (error) {
			console.error('Failed to load trains:', error);
			processLayout.setError('Failed to load trains. Please try again.');
		}
	});

	function handlePhotoSelected(file: File) {
		capturedPhoto = file;
	}

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

			// Convert photo to base64 for storage
			let photoBase64 = '';
			if (capturedPhoto) {
				photoBase64 = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.onloadend = () => resolve(reader.result as string);
					if (capturedPhoto) reader.readAsDataURL(capturedPhoto);
				});
				// Store photo in session storage for verification page
				sessionStorage.setItem('trainArrivalPhoto', photoBase64);
			}

			// Create train arrival record
			const trainArrival: TrainArrival = {
				id: crypto.randomUUID(),
				trainId: selectedTrain.id ?? '',
				trainRefNr: selectedTrain.refNr,
				trainRfidNr: selectedTrain.rfidNr,
				portRailArrivalTimestamp: new Date().toISOString(),
				trainPhotoUrl: photoBase64,
				status: 'pending',
				created: new Date(),
				updated: new Date().toISOString(),
				syncStatus: 'pending'
			};

			// Save to IndexedDB using the generic saveRecord method
			await indexedDBService.saveRecord('trainArrivals', trainArrival);

			// Navigate to verification page
			goto(`/richardsbay/processes/train-arrival/verification?trainRefNr=${encodeURIComponent(trainRefNr)}`);
		} catch (error) {
			console.error('Failed to submit train arrival:', error);
			processLayout.setError('Failed to submit train arrival. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		// Navigate back to processes page
		goto('/richardsbay/processes');
	}

	function isFormValid() {
		return trainRefNr && capturedPhoto;
	}
</script>

<ProcessLayout
	title="Train Arrival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Train Arrival</h5>
		<p class="text-sm text-gray-600">
			Step 1: Train Details &nbsp;&nbsp;&nbsp; Step 2: Verification
		</p>
	</div>

	<div class="space-y-6">
		<!-- Train Reference Number Dropdown -->
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

		<!-- Camera Component -->
		<div class="space-y-2">
			<label class="block font-medium text-gray text-sm">Train Photo *</label>
			<Camera onPhotoSelected={handlePhotoSelected} />
		</div>

		<!-- Form Validation Message -->
		{#if !isFormValid()}
			<p class="text-sm text-amber-600">
				Please select a Train Reference Number and capture a photo before submitting.
			</p>
		{/if}
	</div>
</ProcessLayout>

<style>
	.space-y-6 > * + * {
		margin-top: 1.5rem;
	}
</style>