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
			console.log('Matching train:', matchingTrain);
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
		goto('/richardsbay/processes/rail');
	}
</script>

<ProcessLayout
	title="Train Arrival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/rail"
	bind:this={processLayout}
	showCancel={false}
	showSubmit={false}
>
	<div class="space-y-6">
		<!-- Verification Result -->
		{#if verificationResult === 'success'}
			<!-- Train Information Display -->
			<div class="box bg-gray-50 rounded-lg p-4">
				<h4 class="font-semibold text-gray-800 mb-3">Train Details</h4>
				<div class="grid grid-cols-1 gap-4">
					<div>
						<span class="font-medium text-gray-600">Train Reference Number:</span>
						<div class="text-gray-800">{trainRefNr}</div>
					</div>
					<div>
						<span class="font-medium text-gray-600">Train RFID Number:</span>
						<div class="text-gray-800">{trainRfidNr}</div>
					</div>
					<div>
						<span class="font-medium text-gray-600">Arrival Timestamp:</span>
						<div class="text-gray-800">{new Date(arrivalTimestamp).toLocaleString()}</div>
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

		{:else}
			<!-- Loading State -->
			<div class="text-center py-8">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<p class="text-gray-600">Verifying train reference...</p>
			</div>
		{/if}
	</div>
</ProcessLayout>

<style>
	.box {
        box-shadow: 0 2px 8px 0 rgba(0,0,0,0.07), 0 1.5px 4px 0 rgba(0,0,0,0.03);
    }
	.font-semibold.text-gray-800.mb-3 {
		font-size: 22px;
	}
	.font-medium.text-gray-600 {
		font-weight: bold;
	}
</style>