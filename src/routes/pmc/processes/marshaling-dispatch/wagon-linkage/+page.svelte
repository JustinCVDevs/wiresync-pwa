<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import WagonInput from '$lib/components/WagonInput.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { TrainDispatch } from '$lib/types/trainDispatch';
	import type { Consignment, Train, Wagon } from '$lib';
	import { ArrowDownToDotIcon, Container, Plane, PlusCircle } from 'lucide-svelte';
  
	let dispatchId = '';
	$: dispatchId = $page.url.searchParams.get('dispatchId') || '';
  
	let trainDispatch: TrainDispatch | undefined;
	let showWagonInput = false;
	let error = '';
	let success = '';
	let isLoading = true;
  
	const steps = [
	  'Train & Consignment',
	  'Wagon Linkage',
	  'Complete',
	];
	let currentStep = 2;
	let train : Train | undefined;
	let consignment : Consignment | undefined;
	let wagons : Wagon[] | undefined;

	async function loadDispatch() {
	  isLoading = true;
	  try {
		const record = await indexedDBService.getRecord('trainDispatches', dispatchId);
		if (!record) {
		  error = 'Train dispatch not found';
		  return;
		}
		trainDispatch = record;
		if(trainDispatch !== undefined && trainDispatch != null){

			train = (await indexedDBService.getTrains()).find(t => trainDispatch?.linkedTrainId === t.id);
			consignment = (await indexedDBService.getAllRecords("consignments")).find(t => trainDispatch?.linkedConsignmentId === t.id);
			wagons = (await indexedDBService.getAllRecords("wagons")).filter(t => trainDispatch?.linkedWagonIds?.includes(t?.id ?? '') || trainDispatch?.linkedWagonIds?.includes(t?.serverId ?? ''));
			// wagons = (await indexedDBService.getAllRecords("wagons")).filter(t => trainDispatch.linkedWagonIds?.includes(t.id));
	}
	

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
  
	async function handleWagonSubmit(event: { preventDefault: () => void; detail: { rfidTag: any; wagonId: any; image: any; }; }) {
		event.preventDefault();
	  if (!trainDispatch) return;
	  error = '';
	  try {
		let wagonIndexId =  crypto.randomUUID();
		const receivalData: Wagon = {
				transcoreTag: event.detail.rfidTag,
				wagonIdSimple: event.detail.wagonId,
				wagonPhotoUrl: event.detail.image,
				created: new Date(),
				componentType: 'MARSHALING_DISPATCH',
				id:wagonIndexId,
				updated: new Date().toISOString(),
				syncStatus: 'pending',
				process: 'Marshaling_Dispatch'
			};

			await indexedDBService.saveRecord('wagons', receivalData);

		const updatedIds = [...(trainDispatch.linkedWagonIds ?? []), wagonIndexId];
		await indexedDBService.updateRecord('trainDispatches', dispatchId, {
		  ...trainDispatch,
		  linkedWagonIds: updatedIds,
		  updated: new Date().toISOString()
		});
		success = 'Wagon added';
			currentStep = 3;
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
	  goto(`/pmc/processes/complete`);
	}

  </script>
  <ProcessLayout
	title="Wagon Linkage"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/pmc/processes"
	on:cancel={() => goto('/pmc/processes')}
	on:submit={handleReview}
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
		<h2 class="mb-2 text-base font-semibold dark:text-gray">Train Details</h2>
		<p class="text-sm dark:text-gray">Train Ref: <span class="font-bold">{train?.refNr || '-'}</span></p>
		<p class="text-sm dark:text-gray">Consignment: <span class="font-bold">{consignment?.name || '-'}</span></p>
		<p class="text-sm dark:text-gray">Train RFID: <span class="font-bold">{train?.rfidNr || '-'}</span></p>
	  </div>
  
	  <!-- Linked Wagons -->
	  <div class="mb-6">
		<p class="mb-2 text-sm text-gray">Linked Wagons: <span class="font-bold">{trainDispatch?.linkedWagonIds?.length || 0}</span></p>
		{#if trainDispatch?.linkedWagonIds?.length}
		  <ul class="space-y-1">
			{#each trainDispatch.linkedWagonIds as id, i}
			
			  <li class="rounded bg-white shadow-sm px-3 py-2   flex items-center align-middle gap-3">
				<Container size={16} class="inline text-xs"/>
				<div>

				<div class="text-gray font-medium "><span class="text-sm font-light">Wagon ID</span>: {wagons?.find((w)=> w.id == id)?.transcoreTag}</div>
				
				<div class="text-xs text-gray-400 text-left">
					Date linked: {wagons?.find((w) => w.id == id)?.created
						? new Date(wagons.find((w) => w.id == id)?.created!).toLocaleString("en-GB", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
							hour12: false
						})
						: "–"}
			</div>
		</div>
			  </li>
			{/each}
		  </ul>
		{:else}
		  <p class="text-gray-400 italic">No wagons linked yet.</p>
		{/if}
	  </div>
  
	  <!-- Add Wagon -->
	  {#if showWagonInput}
		<div class="fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm  bg-opacity-40">
		  <div class="w-full max-w-sm rounded-lg bg-white p-6 m-6 shadow-xl">
			<form on:submit|preventDefault>
				<WagonInput on:submit={handleWagonSubmit} on:cancel={handleWagonCancel} />

			</form>
			
		  </div>
		</div>
	  {:else}
		<button
		  class="w-full mb-4 rounded-md bg-gray py-3  text-sm text-white hover:bg-blue-700"
		  on:click={() => {currentStep=2;showWagonInput = true}}
		>+ Add Wagon</button>
	  {/if}
  
	  <!-- Navigation Buttons -->
	  <!-- <div class="flex gap-4 mt-8">
		<button
		  class="flex-1 rounded-md bg-gray-300 py-3 text-gray font-semibold hover:bg-gray-400"
		  on:click={() => goto(`/pmc/processes/marshaling-dispatch?dispatchId=${dispatchId}`)}
		>Back</button>
		<button
		  class="flex-1 rounded-md bg-green-600 py-3 text-white font-semibold hover:bg-green-700"
		  on:click={handleReview}
		>Next</button>
	  </div> -->
	{/if}
  </ProcessLayout>
