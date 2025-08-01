<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types';
	import { Container } from 'lucide-svelte';

	let wagonIds: string[] = [];
	$: wagonIds = ($page.url.searchParams.get('wagonIds') || '').split(',').filter(Boolean);

	let trainRefNr = $page.url.searchParams.get('trainRefNr') || '';
	let wagons: Wagon[] = [];
	let filteredWagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isLoading = true;
	let processLayout: ProcessLayout;

	const steps = ['Arrival Train', 'Wagon', 'Verification'];
	let currentStep = 3;

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}
	
	async function loadWagons() {
		isLoading = true;
		try {
			const allWagons = await indexedDBService.getAllRecords('wagons');
			wagons = allWagons;
			filteredWagons = wagons.filter(w => wagonIds.includes(w.id));
		} catch (e) {
			console.error(e);
			error = 'Failed to load wagon data';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadWagons();
	});

	function handleNewWagon() {
		goto(`/richardsbay/processes/rail/train-staging/wagons/?wagonIds=${wagonIds.join(',')}&trainRefNr=${trainRefNr}`);
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail/train-staging');
	}

	async function handleSubmit() {
		let linkedTrain = (await indexedDBService.getAllRecords('trains')).filter(
			train => train.refNr === trainRefNr
		)[0];

		let trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).filter(
			train => train.trainId === linkedTrain.id
		)[0];

		await indexedDBService.updateRecord('trainArrivals', trainArrival.id, {
			portStagingTimestamp: formatTimestamp(new Date()),
			status: 'sampling',
			syncStatus: 'pending'
		})

		processLayout.setSuccess('Wagons Successfully Received!');

		setTimeout(() => {
			goto('/richardsbay/processes/rail/train-staging');
		}, 1000);
	}
</script>

<ProcessLayout
	title="Train Staging - Review"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/richardsbay/processes/rail/train-staging"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div class="mb-4">
		<h5 class="text-xl font-bold text-gray">Review & Complete</h5>
		<p class="text-sm text-gray">
			Review the entered data and complete the train staging
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
		<div class="text-center">Loading...</div>
	{:else}
		<!-- Linked Wagons -->
		<div class="mb-6">
			<div class="mb-4 flex items-center justify-between">
				<p class="text-sm text-gray">Staged Wagons: <span class="font-bold">{filteredWagons.length}</span></p>
				<button
					type="button"
					class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
					on:click={handleNewWagon}
				>+ New Wagon</button>
			</div>

			{#if filteredWagons.length > 0}
				<div class="space-y-3">
					{#each filteredWagons as wagon}
						<div class="flex items-center gap-3 rounded bg-white px-3 py-2 shadow-sm">
							<Container size={16} class="inline text-xs" />
							<div class="flex-1">
								<div class="font-medium text-gray">
									<span class="text-sm font-light">Wagon ID:</span> {wagon.wagonId}
								</div>
								<div class="font-medium text-gray">
									<span class="text-sm font-light">
										Staging Date: </span> 
										{wagon.dispatchTimestamp 
										? new Date(wagon.dispatchTimestamp).toLocaleDateString('en-GB')
										: 'Not set'}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-500">No wagons added yet</p>
			{/if}
		</div>
	{/if}
</ProcessLayout>

<style>

</style>