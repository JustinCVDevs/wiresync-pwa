<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train } from '$lib/types/train';

	// Form state
	let isSubmitting = false;
	let submit = false;
	let currentStep = 1;
	let arrivalTimestamp = formatTimestamp(new Date());
	let showSearch = false;
	let matchFound = false;

	let availableTrains: Train[] = [];
	let filteredTrains: any[] = [];
	let selectedTrain: any = '';

	// Process steps
	const processSteps = ['Registration', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Fetch all train arrivals
		const trainArrivals = (await indexedDBService.getAllRecords('trainArrivals')).filter(
			arrival => arrival.portRailArrivalTimestamp === ''
		);

		// Fetch all trains
		const allTrains = (await indexedDBService.getAllRecords('trains'));

		// Filter trains that match the train arrivals' port_arrival_sample_id
		availableTrains = allTrains.filter(train =>
			trainArrivals.some(arrival => arrival.trainId === train.serverId)
		);
	});

	$: {
		if (selectedTrain) {
			if (filteredTrains.length > 0) {
				matchFound = filteredTrains.some(train => train.refNr?.toLowerCase() === selectedTrain?.toLowerCase());
				if (matchFound) {
					currentStep = 2;
				}
			}
		}
	}

	$: {
		filteredTrains = availableTrains.filter(train =>
			train.refNr?.toLowerCase().includes(selectedTrain?.toLowerCase() ?? '')
		);
	}

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	async function handleSubmit() {
		try {
			isSubmitting = true;
			submit = true;
			processLayout.setError('');

			// Check if train exists in Pocketbase DB
			const trains = (await indexedDBService.getAllRecords('trains')).filter(
				train => train.refNr.toLowerCase() === selectedTrain.toLowerCase()
			)[0];

			// Update Train Arrival data
			const trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).filter(
				arrival => arrival.trainId === trains.serverId
			)[0];

			// Save to IndexedDB using the generic saveRecord method
			await indexedDBService.updateRecord('trainArrivals', trainArrival.id, {
					...trainArrival,
					syncStatus: 'pending',
					portRailArrivalTimestamp: arrivalTimestamp,
					status: 'sampling',
				});

			processLayout.setSuccess('Train Successfully Received!');

			setTimeout(() => {
				location.reload();
			}, 1000);
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
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Train Arrival</h5>
	</div>

	<div class="space-y-6">
		<div class="form">
			<FormField
				id="trainRegistration"
				label="Train Registration"
				search={true}
				options={filteredTrains.map(train => ({ value: train.refNr, label: train.refNr }))}
				bind:value={selectedTrain}
				placeholder="Select Train Registration"
				required
				on:focus={() => showSearch = true}
				on:blur={() => setTimeout(() => (showSearch = false), 200)}
			/>

			{#if matchFound}
				<div style="margin-top: 1.2rem;">
					<FormField
						id="arrivalTimestamp"
						label="Arrival Timestamp:"
						bind:value={arrivalTimestamp}
						placeholder="Enter train registration"
						disabled={true}
					/>
				</div>
				{#if !submit}
					<div style="margin-top: 1.5rem;" class="text-green-500 mt-1 font-bold text-center">Train Successfully Received</div>
				{/if}
			{/if}
		</div>
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
