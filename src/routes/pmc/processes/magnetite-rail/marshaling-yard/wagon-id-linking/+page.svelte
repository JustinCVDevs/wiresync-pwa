<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';

	let shuntingTrains: ShuntingTrain[] = [];
	let selectedTrain = '';
	let error = '';
	let success = '';
	let isLoading = true;
	let isSubmitting = false;

	const steps = ['Select Shunting Train', 'Wagon Linking'];
	let currentStep = 1;

	async function loadShuntingTrains() {
		try {
			const trainRecords = await indexedDBService.getRecords(
				'shuntingTrains',
				(rec) => rec.syncStatus === 'synced'
			);
			shuntingTrains = trainRecords.filter(
				(train: ShuntingTrain) => !train.verificationTimestamp && train.siteLocation === 'PMC'
			).sort((a, b) => {
				const dateA = a.postDate ? new Date(a.postDate).getTime() : 0;
				const dateB = b.postDate ? new Date(b.postDate).getTime() : 0;
				return dateB - dateA;
			});
		} catch (e) {
			console.error(e);
			error = 'Failed to load shunting trains';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadShuntingTrains);

	async function handleSubmit() {
		error = '';
		if (!selectedTrain) {
			error = 'Please select a train';
			return;
		}

		try {
			isSubmitting = true;

			// Find the selected train object
			const selectedTrainObj = shuntingTrains.find(train => 
				train.postDate ? new Date(train.postDate).toISOString() === selectedTrain : false
			);
			
			if (!selectedTrainObj) {
				error = 'Selected train not found';
				return;
			}

			// Navigate to wagon details page with train ID
			goto(`/pmc/processes/magnetite-rail/marshaling-yard/wagon-id-linking/wagons/${selectedTrainObj.id}`);
		} catch (e: any) {
			console.error(e);
			error = 'Failed to process selection';
		} finally {
			isSubmitting = false;
		}
	}

	function formatDate(date: Date | undefined): string {
		if (!date) return 'No date';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-rail/marshaling-yard');
	}
</script>

<ProcessLayout
	title="Wagon ID Linking"
	{steps}
	{currentStep}
	{isSubmitting}
	cancelPath="/pmc/processes/magnetite-rail/marshaling-yard"
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	on:error={({ detail }) => (error = detail)}
	on:success={({ detail }) => (success = detail)}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Select Shunting Train</h5>
		<p class="text-sm text-gay">
			Please select a shunting train for wagon ID linking
		</p>
	</div>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
			{success}
		</div>
	{/if}

	{#if isLoading}
		<div>Loading…</div>
	{:else}
		<FormField
			label="Shunting Train Date"
			id="trainSelect"
			isSelect={true}
			placeholder="Select Shunting Train Date"
			bind:value={selectedTrain}
			options={shuntingTrains.map((train) => ({
				value: train.postDate ? new Date(train.postDate).toISOString() : '',
				label: formatDate(train.postDate)
			}))}
		/>
	{/if}
</ProcessLayout>