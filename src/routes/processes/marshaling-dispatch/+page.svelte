<script lang="ts">
	import { onMount } from 'svelte';
	import Camera from '$lib/components/Camera.svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train, Consignment } from '$lib/types';
	import type { TrainDispatch } from '$lib';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
  
	let trains: Train[] = [];
	let consignments: Consignment[] = [];
	let selectedTrainRef = '';
	let selectedConsignment = '';
	let manualConsignment = '';
	let selectedRfid = '';
	let manualRfid = '';
	let capturedImage: string | null = null;
	let showCamera = false;
	let error = '';
	let success = '';
	let isLoading = true;
	
	const steps = ['Train & Consignment Details', 'Wagon Linkage', 'Complete'];
	let currentStep = 1;
  	let train : Train;
	async function loadTrainsAndConsignments() {
	  try {
		const trainRecords = await indexedDBService.getRecords(
		  'trains', rec => rec.syncStatus === 'synced'
		);
		trains = trainRecords;
		
		if (selectedTrainRef) {
		  train = trains.find(t => t.refNr === selectedTrainRef);
		  manualConsignment = '';
		  selectedConsignment = '';
		  selectedRfid = '';
		  manualRfid = '';
		  capturedImage = null;
		  showCamera = false;
		  error = '';
		  if (train) {
			consignments = await indexedDBService.getRecords(
			  'consignments', rec =>
				rec.syncStatus === 'synced' && rec.linkedTrainId === train.serverId
			);
		  }
		}
	  } catch (e) {
		console.error(e);
		error = 'Failed to load data';
	  } finally {
		isLoading = false;
	  }
	}
  
	onMount(loadTrainsAndConsignments);
	$: if (selectedTrainRef) loadTrainsAndConsignments();
  
	function handleCapture(event: CustomEvent<string>) {
	  capturedImage = event.detail;
	}
	function handleCameraClose() {
	  showCamera = false;
	}
  
	async function handleSubmit() {
	  error = '';
	  if (!selectedTrainRef) {
		error = 'Please select a train reference number';
		return;
	  }
	  if (!selectedConsignment && !manualConsignment) {
		error = 'Please select or enter a consignment number';
		return;
	  }
	  if (!train?.serverId) return;
  
	  const dispatchId = crypto.randomUUID();
	  const trainDispatch: TrainDispatch = {
		id: dispatchId,
		linkedTrainId: train.serverId,
		linkedConsignmentId:  selectedConsignment || undefined,
		process: 'MarshalingDispatch',
		syncStatus: 'pending',
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	  };
	  function genId(len = 15) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}
	  try {
		if (manualConsignment) {
		  await indexedDBService.saveRecord('consignments', {
			id: genId(),
			name: manualConsignment,
			linkedTrainId: train.serverId,
			syncStatus: 'pending',
			created: new Date().toISOString(),
			updated: new Date().toISOString()
		  });
		}
		if (manualRfid) {
		  await indexedDBService.updateRecord('trains', train.serverId, {
			...train,
			rfidNr: manualRfid,
			syncStatus: 'pending',
			updated: new Date().toISOString()
		  });
		}
		await indexedDBService.saveRecord('trainDispatches', trainDispatch);

		success = 'Dispatch initialized';
		goto(`/processes/marshaling-dispatch/wagon-linkage?dispatchId=${dispatchId}`);
	  } catch (e: any) {
		console.error(e);
		error = 'Failed to initialize dispatch' + e?.data?.toJson();
	  }
	}
  </script>
  
  <ProcessLayout
	title="Marshaling Dispatch"
	processKey="marshaling-dispatch"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/processes"
	on:cancel={() => goto('/processes')}
	on:submit={handleSubmit}
	on:error={({ detail }) => error = detail}
	on:success={({ detail }) => success = detail}
  >
	<slot name="header" />
  
	{#if error}
	  <div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
		{error}
	  </div>
	{/if}
  
	{#if isLoading}
	  <div>Loading…</div>
	{:else}
	  <div class="space-y-6">
		  <select id="trainRef" bind:value={selectedTrainRef} class="w-full rounded-md border p-2 dark:text-gray-800">
			<option value="">Select Train Reference</option>
			{#each trains as t}
			  <option value={t.refNr}>{t.refNr}</option>
			{/each}
		  </select>

		  {#if consignments.length}
			<select bind:value={selectedConsignment}  class="w-full rounded-md border p-2  dark:text-gray-800">
			  <option value="">Select Consignment</option>
			  {#each consignments as c}
				<option value={c.serverId}>{c.name}</option>
			  {/each}
			</select>
			{:else}
		  
		  <input
			type="text"
			placeholder="Enter Consignment Number"
			bind:value={manualConsignment}
			
			class="w-full rounded-md border p-2 dark:text-gray-800"
		  />
		  
		  {/if}
  
		<!-- <FormField label="Train RFID Number" id="trainRfid"> -->
		  {#if trains.find(t => t.refNr === selectedTrainRef)?.rfidNr}
			<select bind:value={selectedRfid}  class="w-full rounded-md border p-2 dark:text-gray-800">
			  <option value="">Select RFID</option>
			  <option value={trains.find(t => t.refNr === selectedTrainRef)?.rfidNr}>
				{trains.find(t => t.refNr === selectedTrainRef)?.rfidNr}
			  </option>
			</select>
		  {/if}
		  {#if !train?.rfidNr?.length || !train}
		  <input
			type="text"
			
			placeholder="Train RFID Number"
			bind:value={manualRfid}
			
			class="w-full rounded-md border p-2 dark:text-gray-800"
		  />
		  {/if}
		<!-- </FormField> -->
  
		<Camera {showCamera} on:capture={handleCapture} on:close={handleCameraClose} />
  
		{#if capturedImage}
		  <div class="overflow-hidden rounded-lg border">
			<img src={capturedImage} alt="Captured RFID" class="h-48 w-full object-cover" />
			<button type="button" class="w-full bg-gray-800 py-2 text-white" on:click={() => showCamera = true}>
			  Retake Photo
			</button>
		  </div>
		
		{/if}
	  </div>
	{/if}
  </ProcessLayout>
  