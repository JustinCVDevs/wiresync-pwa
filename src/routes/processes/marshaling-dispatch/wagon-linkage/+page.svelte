<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import WagonInput from '$lib/components/WagonInput.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { TrainDispatch } from '$lib/types/trainDispatch';
  
	let dispatchId = '';
	$: dispatchId = $page.url.searchParams.get('dispatchId') || '';
  
	let trainDispatch: TrainDispatch | undefined;
	let showWagonInput = false;
	let error = '';
	let success = '';
	let isLoading = true;
  
	const steps = [
	  'Train & Consignment Details',
	  'Wagon Linkage',
	  'Complete',
	];
	let currentStep = 2;
  
	async function loadDispatch() {
	  isLoading = true;
	  try {
		const record = await indexedDBService.getRecord('trainDispatches', dispatchId);
		if (!record) {
		  error = 'Train dispatch not found';
		  return;
		}
		trainDispatch = record;
	  } catch (e) {
		console.error(e);
		error = 'Failed to load dispatch data';
	  } finally {
		isLoading = false;
	  }
	}
  
	onMount(() => {
	  if (dispatchId) loadDispatch();
	});
  
	$: if (dispatchId) loadDispatch();
  
	async function handleWagonSubmit(event: CustomEvent<{ wagonId: string; rfidTag: string; image: string | null }>) {
	  if (!trainDispatch) return;
	  error = '';
	  try {
		const updatedIds = [...(trainDispatch.linkedWagonIds || []), event.detail.wagonId];
		await indexedDBService.updateRecord('trainDispatches', dispatchId, {
		  ...trainDispatch,
		  linkedWagonIds: updatedIds,
		  updated: new Date().toISOString()
		});
		success = 'Wagon added';
		await loadDispatch();
		showWagonInput = false;
	  } catch (e) {
		console.error(e);
		error = 'Failed to add wagon';
	  }
	}
  
	function handleWagonCancel() {
	  showWagonInput = false;
	}
  
	function handleReview() {
	  goto(`/processes/marshaling-dispatch/review?dispatchId=${dispatchId}`);
	}
  </script>
  
  <ProcessLayout
	title="Marshaling Dispatch - Wagon Linkage"
	processKey="marshaling-dispatch"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/processes"
	on:cancel={() => goto('/processes')}
  >
	{#if error}
	  <div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
		{error}
	  </div>
	{/if}
  
	{#if isLoading}
	  <div class="text-center">Loading...</div>
	{:else}
	  <!-- Train Dispatch Info -->
	  <div class="mb-6 rounded-lg border bg-gray-50 p-4">
		<h2 class="mb-2 text-base font-semibold dark:text-gray-800">Train Details</h2>
		<p class="text-sm dark:text-gray-800">Train Ref: <span class="font-bold">{trainDispatch?.linkedTrainId || '-'}</span></p>
		<p class="text-sm dark:text-gray-800">Consignment: <span class="font-bold">{trainDispatch?.linkedConsignmentId || '-'}</span></p>
	  </div>
  
	  <!-- Linked Wagons -->
	  <div class="mb-6">
		<p class="mb-2 text-sm text-gray-600">Loaded Wagons: <span class="font-bold">{trainDispatch?.linkedWagonIds?.length || 0}</span></p>
		{#if trainDispatch?.linkedWagonIds?.length}
		  <ul class="space-y-1">
			{#each trainDispatch.linkedWagonIds as id, i}
			  <li class="rounded bg-gray-100 px-3 py-2 flex items-center justify-between">
				<span class="font-mono text-sm">{id}</span>
				<span class="text-xs text-gray-400">Wagon {i + 1}</span>
			  </li>
			{/each}
		  </ul>
		{:else}
		  <p class="text-gray-400 italic">No wagons linked yet.</p>
		{/if}
	  </div>
  
	  <!-- Add Wagon -->
	  {#if showWagonInput}
		<div class="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-40">
		  <div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
			<WagonInput on:submit={handleWagonSubmit} on:cancel={handleWagonCancel} />
			
		  </div>
		</div>
	  {:else}
		<button
		  class="w-full mb-4 rounded-md bg-blue-600 py-3 text-white hover:bg-blue-700"
		  on:click={() => showWagonInput = true}
		>Add Wagon</button>
	  {/if}
  
	  <!-- Navigation Buttons -->
	  <div class="flex gap-4 mt-8">
		<button
		  class="flex-1 rounded-md bg-gray-300 py-3 text-gray-700 font-semibold hover:bg-gray-400"
		  on:click={() => goto(`/processes/marshaling-dispatch?dispatchId=${dispatchId}`)}
		>Back</button>
		<button
		  class="flex-1 rounded-md bg-green-600 py-3 text-white font-semibold hover:bg-green-700"
		  on:click={handleReview}
		>Next</button>
	  </div>
	{/if}
  </ProcessLayout>
  