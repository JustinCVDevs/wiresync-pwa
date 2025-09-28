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

	let availableTrains: any[] = [];
	let selectedTrain: any = '';
	let comment: string | undefined = '';
	const processSteps = ['Arrival Train', 'Wagon', 'Verification'];
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Fetch all train arrivals
		const trainArrivals = (await indexedDBService.getAllRecords('trainArrivals')).filter(
			arrival => arrival.portRailArrivalTimestamp && !arrival.portStagingTimestamp
		);

		let linkedTrains = trainArrivals.map(arrival => arrival.trainId);

		// Fetch all trains
		const allTrains = (await indexedDBService.getAllRecords('trains')).filter(train =>
			linkedTrains.includes(train.serverId)
		);

		// Filter trains that match the train arrivals' port_arrival_sample_id
		const filteredTrains = allTrains.filter(train =>
			trainArrivals.some(arrival => arrival.trainId === train.serverId)
		);

		availableTrains = filteredTrains.map(train => ({
			value: train.refNr,
			label: train.refNr
		}));
	});

	async function fetchComment() {
		if (!selectedTrain) {
			comment = '';
			return;
		}
		const train = (await indexedDBService.getAllRecords('trains')).find(
			t => t.refNr === selectedTrain
		);
		if (!train) {
			comment = '';
			return;
		}
		const trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).find(
			arrival => arrival.trainId === train?.serverId
		);
		if (!trainArrival) {
			comment = '';
			return;
		}
		comment = trainArrival.comment;
	}

	$: if (selectedTrain) {
		fetchComment();
	}

	async function handleSubmit() {
		isSubmitting = true;
		try {
			if (!selectedTrain) {
				processLayout.setError('Please select a train reference number.');
				isSubmitting = false;
				return;
			}
			const train = (await indexedDBService.getAllRecords('trains')).find(
				t => t.refNr === selectedTrain
			);

			const trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).find(
				arrival => arrival.trainId === train?.serverId
			);
			if (!trainArrival) {
				processLayout.setError('Train arrival not found.');
				isSubmitting = false;
				return;
			}

			await indexedDBService.updateRecord('trainArrivals', trainArrival.id, {
				comment: comment,
				syncStatus: 'pending'
			});

			// Check linked wagons for stagingTimestamp
			const linkedWagonIds = trainArrival.linkedWagonIds || [];
			const wagons = await indexedDBService.getAllRecords('wagons');
			const hasStagedWagon = linkedWagonIds.some(wid => {
				const wagon = wagons.find(w => w.id === wid || w.serverId === wid);
				return wagon && wagon.stagingTimestamp;
			});

			if (hasStagedWagon) {
				goto(`/richardsbay/processes/rail/train-staging/wagons/review?trainRefNr=${selectedTrain}`);
			} else {
				goto(`/richardsbay/processes/rail/train-staging/wagons?trainRefNr=${selectedTrain}`);
			}
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail');
	}

</script>

<ProcessLayout
	title="Train Staging"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/rail"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Staging Arrived Trains</h5>
	</div>

	<div class="space-y-6">
		<div class="form">
			<FormField
				id="trainArrival"
				label="Train Reference Number"
				isSelect={true}
				options={availableTrains}
				bind:value={selectedTrain}
				placeholder="Select Train Reference Number"
				required
			/>
		</div>
		{#if selectedTrain}
			<FormField
				id="comment"
				label="Comment"
				isSelect={false}
				bind:value={comment}
				placeholder="Enter your comment"
			/>
		{/if}
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
