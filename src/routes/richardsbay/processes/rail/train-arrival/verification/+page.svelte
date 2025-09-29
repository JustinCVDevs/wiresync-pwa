<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TrainArrival, Train } from '$lib';

	const trainArrivalId = $page.url.searchParams.get('trainArrivalId') || '';
	let trainArrival: TrainArrival | null = null;
	let train: Train | null = null;
	let currentStep = 2;
	let processLayout: ProcessLayout;
	
	// Process steps
	const processSteps = ['Registration', 'Verification'];

	onMount(async () => {
		await loadTrainArrivalData();
	});

	async function loadTrainArrivalData() {
		if (trainArrivalId) {
			const result = (await indexedDBService.getAllRecords('trainArrivals')).find(
				(a) => a.id === trainArrivalId || a.serverId === trainArrivalId
			);
			trainArrival = result ?? null;

			const linkedTrain = (await indexedDBService.getAllRecords('trains')).find(
				(t) => t.id === trainArrival?.trainId || t.serverId === trainArrival?.trainId
			);
			train = linkedTrain ?? null;
		}
	}

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail/train-arrival');
	}

	function handleSubmit() {
		processLayout.setSuccess('Train has successfully been received.');

		setTimeout(() => {
			goto('/richardsbay/processes/rail/train-arrival');
		}, 1000);
	}
</script>

<ProcessLayout
	title="Train Arrival Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	bind:this={processLayout}
	cancelPath="/richardsbay/processes/rail/train-arrival"
>
	<div class="space-y-4">
		{#if trainArrival}
			<div class="bg-white p-4 rounded-lg shadow-sm">
				<div class="grid grid-cols-1 gap-4">
					<div>
						<p class="text-sm text-gray-500 font-bold">Train Reference Nr</p>
						<p class="font-medium">{train?.refNr}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Arrival Timestamp</p>
						<p class="font-medium">{formatTimestamp(new Date(trainArrival.portRailArrivalTimestamp ?? ''))}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Train Photo</p>
						<!-- svelte-ignore a11y_img_redundant_alt -->
						<img class="max-w-xs rounded shadow" src={trainArrival.trainPhotoUrl} alt="Train Photo"/>
					</div>
				</div>
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-gray-500">Loading train details...</p>
			</div>
		{/if}
	</div>
</ProcessLayout>