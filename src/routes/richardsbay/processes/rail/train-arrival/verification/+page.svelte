<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TrainArrival } from '$lib/types/trainArrival';

	let trainRefNr = '';
	let isSubmitting = false;
	let currentStep = 2;
	let arrivalTimestamp = '';
	let trainArrival: TrainArrival | null = null;

	// Process steps
	const processSteps = ['Train Arrival Details', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Get data from URL params
		const urlParams = new URLSearchParams($page.url.search);
		trainRefNr = urlParams.get('trainRefNr') || '';

		await loadTrainArrival();
	});

	function formatTimestamp(timestamp: string | undefined): string {
		if (!timestamp) {
			return 'Timestamp not available';
		}

		const date = new Date(timestamp);
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');

		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	async function loadTrainArrival() {
		if (trainRefNr) {
			const result = (await indexedDBService.getAllRecords('trainArrivals')).filter(
				arrival => arrival.trainRefNr === trainRefNr
			)[0];

			trainArrival = result ?? null;
		}
	}

	async function handleSubmit() {
		processLayout.setSuccess('Train Successfully Received!');

		setTimeout(() => {
			goto('/richardsbay/processes/rail/train-arrival');
		}, 1000);	
	}

	function handleCancel() {
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
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div class="space-y-6">
		<!-- Verification Result -->
		{#if trainArrival}
			<!-- Train Information Display -->
			<div class="box bg-gray-50 rounded-lg p-4">
				<h4 class="font-semibold text-gray-800 mb-3">Train Details</h4>
				<div class="grid grid-cols-1 gap-4">
					<div>
						<span class="font-medium text-gray-600">Train Reference Number:</span>
						<div class="text-gray-800">{trainArrival.trainRefNr}</div>
					</div>
					<div>
						<span class="font-medium text-gray-600">Train RFID Number:</span>
						<div class="text-gray-800">{trainArrival.trainRfidNr}</div>
					</div>
					<div>
						<span class="font-medium text-gray-600">Arrival Timestamp:</span>
						<div class="text-gray-800">{formatTimestamp(trainArrival.portRailArrivalTimestamp)}</div>
					</div>
				</div>
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