<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types';
	import { Container } from 'lucide-svelte';

	let wagonIdSimples: string[] = [];
	$: wagonIdSimples = ($page.url.searchParams.get('wagonIdSimples') || '').split(',').filter(Boolean);

	let trainRefNr = $page.url.searchParams.get('trainRefNr') || '';
	let wagons: Wagon[] = [];
	let filteredWagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isLoading = true;
	let processLayout: ProcessLayout;
	let showPopup = false;

	const steps = ['Arrival Train', 'Wagon Sampling', 'Verification'];
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
			let train = (await indexedDBService.getAllRecords('trains')).find(t => t.refNr === trainRefNr);

			let trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).find(
				arrival => arrival.trainId === train?.serverId
			);

			let linkedWagonIds = trainArrival?.linkedWagonIds || [];

			const allWagons = await indexedDBService.getAllRecords('wagons');

			filteredWagons = linkedWagonIds
				.map(wid => allWagons.find(w => (w.id === wid || w.serverId === wid) && w.sampleTimestamp))
				.filter((w): w is Wagon => !!w);
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
		goto(`/richardsbay/processes/rail/train-sampling/wagons/?trainRefNr=${trainRefNr}`);
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail/train-sampling');
	}

	async function handleSubmit() {
		processLayout.setSuccess('Wagons Successfully Sampled!');

		setTimeout(() => {
			goto('/richardsbay/processes/rail/train-sampling');
		}, 1000);
	}

	async function confirmFinishSampling(confirm: boolean) {
		if (confirm) {
			let train = (await indexedDBService.getAllRecords('trains')).filter(
				train => train.refNr === trainRefNr
			)[0];

			let trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).filter(
				arrival => arrival.trainId === train.serverId
			)[0];

			await indexedDBService.updateRecord('trainArrivals', trainArrival.id, {
				finishSamplingTimestamp: new Date(),
				syncStatus: 'pending'
			});

			processLayout.setSuccess(`Train sampling finished successfully for train ${trainRefNr}.`);
			setTimeout(() => {
				goto('/richardsbay/processes/rail/train-sampling');
			}, 1000);
		}
		showPopup = false;
	}
</script>

<ProcessLayout
	title="Train Sampling - Review"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/richardsbay/processes/rail/train-sampling"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div class="mb-4">
		<h5 class="text-xl font-bold text-gray">Review & Complete</h5>
		<p class="text-sm text-gray">
			Review the entered data and complete the train sampling
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
				<p class="text-sm text-gray">Sampled Wagons: <span class="font-bold">{filteredWagons.length}</span></p>
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
									<span class="text-sm font-light">Wagon ID:</span> {wagon.wagonIdSimple}
								</div>
								<div class="font-medium text-gray">
									<span class="text-sm font-light">
										Port Sample ID: </span> 
										{wagon.portSampleId 
										? wagon.portSampleId
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
<div class="flex space-x-4 button-group">
	<button
		type="button"
		class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
		on:click={() => showPopup = true}
	>
		Finish Train Sampling
	</button>
</div>
<!-- Custom Popup -->
{#if showPopup}
	<div class="popup-overlay">
		<div class="popup-content">
			<p class="popup-message">Are you sure you are done sampling train {trainRefNr}?</p>
			<div class="popup-buttons">
				<button
					type="button"
					class="popup-button confirm-button"
					on:click={() => confirmFinishSampling(true)}
				>
					Yes
				</button>
				<button
					type="button"
					class="popup-button cancel-button"
					on:click={() => confirmFinishSampling(false)}
				>
					No
				</button>
			</div>
		</div>
	</div>
{/if}
<style>
	.flex.space-x-4.button-group {
		margin-left: 1rem;
		margin-right: 1rem;
	}

	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.popup-content {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		text-align: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.popup-message {
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	.popup-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.popup-button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	.confirm-button {
		background: #4caf50;
		color: white;
	}

	.cancel-button {
		background: #f44336;
		color: white;
	}
</style>