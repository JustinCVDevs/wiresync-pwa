<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import WagonInput from '$lib/components/WagonInput.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { TrainDispatch } from '$lib/types/trainDispatch';
	import type { Consignment, Train, Wagon } from '$lib';
	import { Container } from 'lucide-svelte';
  
	let dispatchId = '';
	$: dispatchId = $page.url.searchParams.get('dispatchId') || '';
  
	let trainDispatch: TrainDispatch | undefined;
	let showWagonInput = false;
	let error = '';
	let success = '';
	let isLoading = true;
	let processLayout: ProcessLayout;
  
	const steps = ['Train & Consignment', 'Wagon Linkage'];
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
  
	async function handleWagonSubmit(event: { preventDefault: () => void; detail: { wagonId: any; }; }) {
		event.preventDefault();
		if (!trainDispatch) return;
		error = '';
		try {
			// Find the existing wagon by wagonId
			const allWagons = await indexedDBService.getAllRecords('wagons');
			const wagon = allWagons.find(w => w.wagonId === event.detail.wagonId);

			if (!wagon) {
				error = 'Wagon not found';
				return;
			}

			await indexedDBService.updateRecord('wagons', wagon.id, {
				...wagon,
				syncStatus: 'pending',
				dispatchTimestamp: new Date(),
				updated: new Date().toISOString()
			});

			// Update trainDispatch with the wagon's id if not already linked
			const updatedIds = [...(trainDispatch.linkedWagonIds ?? [])];
			if (!updatedIds.includes(wagon.id)) {
				updatedIds.push(wagon.id);
			}

			await indexedDBService.updateRecord('trainDispatches', dispatchId, {
				...trainDispatch,
				linkedWagonIds: updatedIds,
				syncStatus: 'pending',
				updated: new Date().toISOString()
			});

			success = 'Wagon linked';
			currentStep = 3;
			await loadDispatch();
			showWagonInput = false;
		} catch (e) {
			console.error(e);
			error = 'Failed to update wagon';
		}
	}
  
	function handleWagonCancel() {
	  showWagonInput = false;
	}
  
	function handleReview() {
		processLayout.setSuccess('Wagon linkage completed');

		setTimeout(() => {
			goto(`/pmc/processes/magnetite-rail/marshaling-yard/marshaling-dispatch`);
		}, 1000);
	}

  </script>
  <ProcessLayout
	title="Wagon Linkage"
	{steps}
	{currentStep}
	bind:this={processLayout}
	isSubmitting={isLoading}
	cancelPath="/pmc/processes/magnetite-rail/marshaling-yard/marshaling-dispatch"
	on:cancel={() => goto('/pmc/processes/magnetite-rail/marshaling-yard/marshaling-dispatch')}
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
								<div class="text-gray font-medium "><span class="text-sm font-light">Wagon ID</span>: {wagons?.find((w)=> w.id == id)?.wagonId}</div>
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
				>+ Add Wagon
			</button>
	  	{/if}
	{/if}
  </ProcessLayout>
