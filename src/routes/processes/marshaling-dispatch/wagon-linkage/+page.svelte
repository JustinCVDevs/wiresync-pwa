<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import WagonInput from '$lib/components/WagonInput.svelte';
	import type { TrainDispatch } from '$lib/types/trainDispatch';

	let dispatchId = $page.url.searchParams.get('dispatchId') || '';
	let trainDispatch: TrainDispatch | undefined;
	let showWagonInput = false;
	let error = '';
	let isLoading = true;

	async function loadDispatch() {
		try {
			const dispatch = await indexedDBService.getRecord('trainDispatches', dispatchId);
			if (!dispatch) {
				error = 'Train dispatch not found';
				return;
			}
			trainDispatch = dispatch;
		} catch (err) {
			error = 'Failed to load dispatch data';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	async function handleWagonSubmit(
		event: CustomEvent<{ wagonId: string; rfidTag: string; image: string | null }>
	) {
		try {
			if (!trainDispatch) return;

			const updatedWagonIds = [...(trainDispatch.linkedWagonIds || []), event.detail.wagonId];

			// Update train dispatch with new wagon
			await indexedDBService.updateRecord('trainDispatches', dispatchId, {
				...trainDispatch,
				linkedWagonIds: updatedWagonIds,
				updated: new Date().toISOString()
			});

			// Reload dispatch data
			await loadDispatch();
			showWagonInput = false;
		} catch (err) {
			error = 'Failed to add wagon';
			console.error(err);
		}
	}

	function handleWagonCancel() {
		showWagonInput = false;
	}

	function handleReview() {
		goto(`/processes/marshaling-dispatch/review?dispatchId=${dispatchId}`);
	}

	$: if (dispatchId) {
		loadDispatch();
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg">
	<h1 class="mb-6 text-center text-2xl font-bold">Link Wagons</h1>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else}
		<div class="space-y-6">
			{#if trainDispatch?.linkedWagonIds?.length}
				<div class="rounded-lg border p-4">
					<h2 class="mb-2 text-lg font-semibold">Linked Wagons</h2>
					<ul class="list-disc pl-5">
						{#each trainDispatch.linkedWagonIds as wagonId}
							<li>{wagonId}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if showWagonInput}
				<WagonInput on:submit={handleWagonSubmit} on:cancel={handleWagonCancel} />
			{:else}
				<button
					class="w-full rounded-md bg-blue-600 py-3 text-white hover:bg-blue-700"
					on:click={() => (showWagonInput = true)}
				>
					Add Wagon
				</button>
			{/if}

			<button
				class="w-full rounded-md bg-gray-600 py-3 text-white hover:bg-gray-700"
				on:click={handleReview}
			>
				Back to Review
			</button>
		</div>
	{/if}
</div>
