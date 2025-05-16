<script lang="ts">
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib';
	import { goto } from '$app/navigation';
  
	let wagonData: Wagon | null = null;
	let error = '';
	let success = '';
	let isEditing = false;
	let isVerifying = false;
	let currentStep = 2;
  
	const steps = ['RFID Linking', 'Verification'];
  
	onMount(async () => {
	  try {
		const url = page.url;
		const id = url.searchParams.get('id');
		if (!id) {
		  error = 'No wagon ID provided';
		  return;
		}
		wagonData = (await indexedDBService.getRecord('wagons', id)) ?? null;
		if (!wagonData) error = 'Wagon data not found';
	  } catch (e) {
		console.error(e);
		error = 'Failed to load wagon data';
	  }
	});
  
	function onEdit() {
	  isEditing = true;
	  error = '';
	  success = '';
	}
  
	async function onSave() {
	  if (!wagonData?.id) return;
	  isEditing = false;
	  try {
		await indexedDBService.updateRecord('wagons', wagonData.id, {
		  ...wagonData,
		  updated: new Date().toISOString()
		});
		success = 'Changes saved';
	  } catch (e) {
		console.error(e);
		error = 'Failed to save changes';
	  }
	}
  
	async function onVerify() {
	  if (!wagonData?.id) return;
	  isVerifying = true;
	  currentStep = 2;
	  try {
		await indexedDBService.updateRecord('wagons', wagonData.id, {
		  ...wagonData,
		  syncStatus: 'pending',
		  updated: new Date().toISOString()
		});
		success = 'Verified successfully';
		setTimeout(() => goto('/pmc/processes'), 3000);
	  } catch (e) {
		console.error(e);
		error = 'Failed to verify';
		isVerifying = false;
	  }
	}
  </script>
  
  <ProcessLayout
	title="Wagon Verification"
	processKey="verify-wagon"
	{steps}
	{currentStep}
	isSubmitting={isVerifying}
	cancelPath="/processes"
	on:cancel={() => goto('/pmc/processes')}
	on:submit={onVerify}
	on:error={({ detail }) => error = detail}
	on:success={({ detail }) => success = detail}
  >
	<div slot="header">
	  <!-- Optional additional header content -->
	</div>
  
	{#if wagonData}
	  <div class="mb-6 rounded border border-gray-200 bg-gray-50 p-4">
		<p class="mb-3 text-xl text-gray-900">Verification</p>
		<p class="mb-4 text-gray">Please verify below.</p>
		<div class="space-y-3">
		  <!-- RFID -->
		  <div class="flex items-center rounded border border-gray-200 bg-white px-3 py-2">
			<span class="w-48 text-gay ">Wagon RFID Nr.</span>
			{#if isEditing}
			  <input
				name="rfidNumber"
				type="text"
				bind:value={wagonData.transcoreTag}
				class="animate-pulse bg-transparent focus:outline-none dark:text-gray"
			  />
			{:else}
			  <span class="font-medium dark:text-gray">{wagonData.transcoreTag}</span>
			{/if}
		  </div>
		  <!-- Wagon ID -->
		  <div class="flex items-center rounded border border-gray-200 bg-white px-3 py-2">
			<span class="w-48 text-gay">Wagon ID/Nr.</span>
			{#if isEditing}
			  <input
				name="wagonNumber"
				type="text"
				bind:value={wagonData.wagonIdSimple}
				class="animate-pulse bg-transparent focus:outline-none dark:text-gray"
			  />
			{:else}
			  <span class="font-medium dark:text-gray">{wagonData.wagonIdSimple}</span>
			{/if}
		  </div>
		</div>
	  </div>
  
	  <div class="flex space-x-4">
		{#if isEditing}
		  <button
			type="button"
			on:click={onSave}
			class="flex-1 rounded bg-gray py-2 text-sm text-white hover:bg-green-700"
		  >
			Save
		  </button>
		{:else}
		  <button
			type="button"
			on:click={onEdit}
			class="flex-1 rounded bg-gray text-sm py-2 text-white hover:bg-red-700"
		  >
			Edit
		  </button>
		{/if}
	  </div>
	{:else}
	  <div>Loading…</div>
	{/if}
  
  </ProcessLayout>
  