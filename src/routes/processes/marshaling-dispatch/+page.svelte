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
  
	async function loadTrainsAndConsignments() {
	  try {
		const trainRecords = await indexedDBService.getRecords(
		  'trains', rec => rec.syncStatus === 'synced'
		);
		trains = trainRecords;
		if (selectedTrainRef) {
		  const train = trains.find(t => t.refNr === selectedTrainRef);
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
	  const train = trains.find(t => t.refNr === selectedTrainRef);
	  if (!train?.serverId) return;
  
	  const dispatchId = crypto.randomUUID();
	  const trainDispatch: TrainDispatch = {
		id: dispatchId,
		linkedTrainId: train.serverId,
		linkedConsignmentId: selectedConsignment || undefined,
		process: 'MarshalingDispatch',
		syncStatus: 'pending',
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	  };
  
	  try {
		await indexedDBService.saveRecord('trainDispatches', trainDispatch);
		if (manualConsignment) {
		  await indexedDBService.saveRecord('consignments', {
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
		success = 'Dispatch initialized';
		goto(`/processes/marshaling-dispatch/wagon-linkage?dispatchId=${dispatchId}`);
	  } catch (e) {
		console.error(e);
		error = 'Failed to initialize dispatch';
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
			<select bind:value={selectedConsignment} disabled={!!manualConsignment} class="w-full rounded-md border p-2  dark:text-gray-800">
			  <option value="">Select Consignment</option>
			  {#each consignments as c}
				<option value={c.name}>{c.name}</option>
			  {/each}
			</select>
		  {/if}
		  <input
			type="text"
			placeholder="Enter Consignment Number"
			bind:value={manualConsignment}
			disabled={!!selectedConsignment}
			class="w-full rounded-md border p-2 dark:text-gray-800"
		  />
  
		<FormField label="Train RFID Number" id="trainRfid">
		  {#if trains.find(t => t.refNr === selectedTrainRef)?.rfidNr}
			<select bind:value={selectedRfid} disabled={!!manualRfid} class="w-full rounded-md border p-2">
			  <option value="">Select RFID</option>
			  <option value={trains.find(t => t.refNr === selectedTrainRef)?.rfidNr}>
				{trains.find(t => t.refNr === selectedTrainRef)?.rfidNr}
			  </option>
			</select>
		  {/if}
		  <input
			type="text"
			placeholder="Enter Train RFID Number"
			bind:value={manualRfid}
			disabled={!!selectedRfid}
			class="w-full rounded-md border p-2"
		  />
		</FormField>
  
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
  