<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TruckArrival } from '$lib/types/truckArrival';

	let truckRegistration = '';
	let portArrivalSampleId = '';
	let capturedPhoto: File | null = null;
	let isSubmitting = false;
	let currentStep = 2;
	let verificationResult: 'success' | 'not_found' | 'pending' = 'pending';
	let arrivalTimestamp = '';
	let foundTruck: TruckArrival | null = null;

	// Process steps
	const processSteps = ['Truck Arrival Details', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Get data from URL params or session storage
		const urlParams = new URLSearchParams($page.url.search);
		truckRegistration = urlParams.get('truckRegistration') || '';
		portArrivalSampleId = urlParams.get('portArrivalSampleId') || '';
		
		// Get photo from session storage if available
		const photoData = sessionStorage.getItem('truckArrivalPhoto');
		if (photoData) {
			// Convert base64 back to File if needed
			capturedPhoto = null; // For now, we'll handle photo separately
		}

		// Automatically start verification
		if (truckRegistration) {
			await handleVerification();
		}
	});

	async function handleVerification() {
		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			// First, find the truck by registration number
			const trucks = await indexedDBService.getRecords('trucks');
			const matchingTruck = trucks.find(truck => truck.registration === truckRegistration);
			console.log('Matching Truck:', matchingTruck);
			console.log('bool check:', matchingTruck === undefined);
			if (matchingTruck === undefined) {
				// Truck registration not found in trucks database
				verificationResult = 'not_found';
				processLayout.setError('Truck Not in Pre-Registration List');
				return;
			}

			// Now get all truck arrivals and find one with matching truckId and gross_timestamp
			const truckArrivals = await indexedDBService.getTruckArrivals();
			console.log('Truck Arrivals:', truckArrivals);
			const matchingTruckArrival = truckArrivals.find(arrival => 
				arrival.truckId === matchingTruck.registration && arrival.gross_timestamp
			);
			console.log('Matching Truck Arrival:', matchingTruckArrival);
			if (matchingTruckArrival) {
				// Check if gross timestamp is within 36 hours
				const grossTime = new Date(matchingTruckArrival.gross_timestamp!);
				const currentTime = new Date();
				const timeDifferenceHours = Math.abs(currentTime.getTime() - grossTime.getTime()) / (1000 * 60 * 60);

				if (timeDifferenceHours <= 36) {
					// Truck found and within time limit
					foundTruck = matchingTruckArrival;
					arrivalTimestamp = new Date().toISOString();
					
					// Update the truck arrival record with PORT_TRUCK_ARRIVAL_TIMESTAMP
					const updatedTruckArrival: TruckArrival = {
						...matchingTruckArrival,
						port_truck_arrival_timestamp: arrivalTimestamp,
						port_arrival_sample_id: portArrivalSampleId,
						status: 'received',
						updated: new Date().toISOString()
					};

					await indexedDBService.saveRecord('truckArrivals', updatedTruckArrival);
					
					verificationResult = 'success';
					processLayout.setSuccess('Truck Successfully Received!');
				} else {
					// Truck found but outside time limit
					verificationResult = 'not_found';
					processLayout.setError('Truck registration found but gross timestamp is older than 36 hours.');
				}
			} else {
				// Truck exists but no arrival record with gross_timestamp found
				verificationResult = 'not_found';
				processLayout.setError('Truck Not in Pre-Registration List');
			}
		} catch (err) {
			processLayout.setError('Failed to verify truck registration');
			console.error(err);
			verificationResult = 'not_found';
		} finally {
			isSubmitting = false;
		}
	}

	function handleRegisterTruck() {
		// Navigate to truck registration page with current data
		goto(`/richardsbay/processes/truck-arrival/register?truckRegistration=${encodeURIComponent(truckRegistration)}&portArrivalSampleId=${encodeURIComponent(portArrivalSampleId)}`);
	}

	function handleBackToProcesses() {
		goto('/richardsbay/processes');
	}

	function handleCancel() {
		goto('/richardsbay/processes/truck-arrival');
	}
</script>

<ProcessLayout
	title="Truck Arrival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/truck-arrival"
	bind:this={processLayout}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Truck Arrival</h5>
		<p class="text-sm text-gray-600">
			Step 1: Registration &nbsp;&nbsp;&nbsp; Step 2: Verification
		</p>
	</div>

	<div class="space-y-6">
		<!-- Verification Status Section -->
		<div class="bg-white rounded-lg border border-gray-200 p-6">
			<h6 class="text-lg font-semibold text-gray-800 mb-4">Scanning Truck Registration</h6>
			
			<!-- Truck Registration Display -->
			<div class="mb-4">
				<span class="block text-sm font-medium text-gray-700 mb-2">
					Please enter Truck Registration
				</span>
				<div class="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-lg font-mono">
					{truckRegistration || 'No registration provided'}
				</div>
			</div>

			<!-- Sample ID Display -->
			<div class="mb-4">
				<span class="block text-sm font-medium text-gray-700 mb-2">
					Please enter Sample ID
				</span>
				<div class="bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
					{portArrivalSampleId || 'No sample ID provided'}
				</div>
			</div>

			<!-- Photo Section -->
			<div class="mb-6">
				<span class="block text-sm font-medium text-gray-700 mb-2">
					Capture a photo of the Truck Registration
				</span>
				<div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
					<div class="text-gray-500">
						{#if capturedPhoto}
							✓ Photo captured
						{:else}
							Photo will be displayed here
						{/if}
					</div>
				</div>
			</div>

			<!-- Verification Result -->
			{#if verificationResult === 'success'}
				<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
					<div class="flex items-center">
						<div class="text-green-600 text-2xl mr-3">✓</div>
						<div>
							<h3 class="text-lg font-semibold text-green-800">Truck Successfully Received!</h3>
						</div>
					</div>
				</div>

				<!-- Truck Information Display -->
				<div class="bg-gray-50 rounded-lg p-4">
					<h4 class="font-semibold text-gray-800 mb-3">Truck Information Received:</h4>
					<div class="space-y-2">
						<div class="flex">
							<span class="font-medium text-gray-600 w-32">Truck Registration:</span>
							<span class="text-gray-800">{truckRegistration}</span>
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
							<h3 class="text-lg font-semibold text-red-800">Truck Not In Pre Registration List.</h3>
						</div>
					</div>
				</div>

				<!-- Not Found Actions -->
				<div class="space-y-3">
					<button
						type="button"
						class="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
						on:click={handleRegisterTruck}
					>
						Register Truck
					</button>
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
					<p class="text-gray-600">Verifying truck registration...</p>
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