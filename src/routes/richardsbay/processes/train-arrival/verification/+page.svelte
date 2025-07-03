<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TrainArrival } from '$lib/types/trainArrival';

	let trainRefNr = '';
	let trainRfidNr = '';
	let capturedPhoto: string | null = null;
	let isSubmitting = false;
	let currentStep = 2;
	let verificationResult: 'success' | 'not_found' | 'pending' = 'pending';
	let arrivalTimestamp = '';
	let foundTrain: TrainArrival | null = null;

	// Process steps
	const processSteps = ['Train Arrival Details', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Get data from URL params
		const urlParams = new URLSearchParams($page.url.search);
		trainRefNr = urlParams.get('trainRefNr') || '';
		
		// Get photo from session storage if available
		capturedPhoto = sessionStorage.getItem('trainArrivalPhoto');

		// Automatically start verification
		if (trainRefNr) {
			await handleVerification();
		}
	});

	async function handleVerification() {
		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			// Find the train by reference number
			const trains = await indexedDBService.getTrains();
			const matchingTrain = trains.find(train => train.refNr === trainRefNr);
			
			if (!matchingTrain) {
				// Train reference not found in trains database
				verificationResult = 'not_found';
				processLayout.setError('Train Not Found in Pre-Registration List');
				return;
			}

			// Now get all train arrivals and find one with matching trainId
			const trainArrivals = await indexedDBService.getTrainArrivals();
			const matchingTrainArrival = trainArrivals.find(arrival => 
				arrival.trainId === matchingTrain.id
			);

			if (matchingTrainArrival) {
				// Train found
				foundTrain = matchingTrainArrival;
				arrivalTimestamp = matchingTrainArrival.portRailArrivalTimestamp || new Date().toISOString();
				trainRfidNr = matchingTrainArrival.trainRfidNr || matchingTrain.rfidNr || 'N/A';
				
				// Update the train arrival record with status
				const updatedTrainArrival: TrainArrival = {
					...matchingTrainArrival,
					status: 'received',
					updated: new Date().toISOString()
				};

				await indexedDBService.saveRecord('trainArrivals', updatedTrainArrival);
				
				verificationResult = 'success';
				processLayout.setSuccess('Train Successfully Received!');
			} else {
				// Train exists but no arrival record found
				verificationResult = 'not_found';
				processLayout.setError('Train Not Found in Pre-Registration List');
			}
		} catch (err) {
			processLayout.setError('Failed to verify train reference');
			console.error(err);
			verificationResult = 'not_found';
		} finally {
			isSubmitting = false;
		}
	}

	function handleBackToProcesses() {
		goto('/richardsbay/processes');
	}

	function handleCancel() {
		goto('/richardsbay/processes');
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
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Train Arrival</h5>
		<p class="text-sm text-gray-600">
			Step 1: Train Details &nbsp;&nbsp;&nbsp; Step 2: Verification
		</p>
	</div>

	<div class="space-y-6">
		<!-- Verification Status Section -->
		<div class="bg-white rounded-lg border border-gray-200 p-6">
			<h6 class="text-lg font-semibold text-gray-800 mb-4">Verifying Train Reference</h6>
			
			<!-- Train Reference Display -->
			<div class="mb-4">
				<span class="block text-sm font-medium text-gray-700 mb-2">
					Train Reference Number
				</span>
				<div class="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-lg font-mono">
					{trainRefNr || 'No reference provided'}
				</div>
			</div>

			<!-- Photo Section -->
			<div class="mb-6">
				<span class="block text-sm font-medium text-gray-700 mb-2">
					Train Photo
				</span>
				<div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
					{#if capturedPhoto}
						<img src={capturedPhoto} alt="Train photo" class="max-h-48 mx-auto" />
					{:else}
						<div class="text-gray-500">Photo not available</div>
					{/if}
				</div>
			</div>

			<!-- Verification Result -->
			{#if verificationResult === 'success'}
				<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
					<div class="flex items-center">
						<div class="text-green-600 text-2xl mr-3">✓</div>
						<div>
							<h3 class="text-lg font-semibold text-green-800">Train Successfully Received!</h3>
						</div>
					</div>
				</div>

				<!-- Train Information Display -->
				<div class="bg-gray-50 rounded-lg p-4">
					<h4 class="font-semibold text-gray-800 mb-3">Train Information Received:</h4>
					<div class="space-y-2">
						<div class="flex">
							<span class="font-medium text-gray-600 w-32">Train Reference Number:</span>
							<span class="text-gray-800">{trainRefNr}</span>
						</div>
						<div class="flex">
							<span class="font-medium text-gray-600 w-32">Train RFID Number:</span>
							<span class="text-gray-800">{trainRfidNr}</span>
						</div>
						<div class="flex">
							<span class="font-medium text-gray-600 w-32">Arrival Timestamp:</span>
							<span class="text-gray-800">{new Date(arrivalTimestamp).toLocaleString()}</span>
						</div>
					</div>
				</div>

				<!-- Success Actions -->
				<div class="mt-6">
					<button
						type="button"
						class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
						on:click={handleBackToProcesses}
					>
						Back to Processes
					</button>
				</div>

			{:else if verificationResult === 'not_found'}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
					<div class="flex items-center">
						<div class="text-red-600 text-2xl mr-3">✗</div>
						<div>
							<h3 class="text-lg font-semibold text-red-800">Train Not In Pre Registration List.</h3>
						</div>
					</div>
				</div>

				<!-- Not Found Actions -->
				<div class="space-y-3">
					<button
						type="button"
						class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
						on:click={handleBackToProcesses}
					>
						Back to Processes
					</button>
				</div>

			{:else}
				<!-- Loading State -->
				<div class="text-center py-8">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p class="text-gray-600">Verifying train reference...</p>
				</div>
			{/if}
		</div>
	</div>
</ProcessLayout>

<style>
	.space-y-6 > * + * {
		margin-top: 1.5rem;
	}

	.space-y-3 > * + * {
		margin-top: 0.75rem;
	}

	.space-y-2 > * + * {
		margin-top: 0.5rem;
	}
</style>