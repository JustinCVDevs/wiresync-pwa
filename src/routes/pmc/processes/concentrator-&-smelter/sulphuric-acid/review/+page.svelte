<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import ProcessLayout from '$lib/components/ProcessLayout.svelte';
    import { indexedDBService } from '$lib/services/indexedDBService';
    import type { TruckLoad } from '$lib/types/truckLoad';
    import type { Assay } from '$lib/types/assay';
    import { page } from '$app/stores';
	import moment from 'moment';
	import type { Truck } from '$lib';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
  
    const steps = ['Truck Details', 'Complete'];
    let currentStep = 2;
  
    let truckLoad: TruckLoad | null | undefined = null;
    let assay: Assay | null | undefined = null;
    let error = '';
  
    // Extract IDs from query parameters
    let truckLoadId = '';
    let assayId = '';
  
    $: {
      const params = new URL($page.url).searchParams;
      truckLoadId = params.get('truckLoadId') || '';
      assayId = params.get('assayId') || '';
    }
  let trucks: Truck[] | null | undefined = null;
    onMount(async () => {
      try {
        if (truckLoadId) {
          truckLoad = await indexedDBService.getRecord('truckLoads', truckLoadId);
        }
        if (assayId) {
          assay = await indexedDBService.getRecord('assays', assayId);
        }
        trucks = await indexedDBService.getAllRecords('trucks');
      } catch (err) {
        console.error(err);
        error = 'Failed to load verification data';
      }
    });
  
    function handleComplete() {
		formPersistenceService.clearForm('acid_truck')
      goto('/pmc/processes/complete');
    }
  </script>
  <div class="p-4">

      <h5 class="text-gray text-center text-xl font-bold">Truck Verification</h5>
  
    {#if error}
      <div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
        {error}
      </div>
    {/if}
  
    {#if truckLoad && assay}
      <div class="mb-6 rounded border text-xs p-4 bg-white">
        <div class="flex flex-col gap-2">
          <div class="flex justify-between  text-leftitems-center">
            <span class="font-semibold">📄 Truck registration:</span>
            <span>{trucks?.find((t)=> t.id == truckLoad?.truckId)?.registration}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="font-semibold">🪣 Tank loaded from:</span>
            <span>{truckLoad.loadingLocation}</span>
          </div>
		  <div class="flex justify-between items-center">
            <span class="font-semibold">⚡️ Strong/Weak:</span>
            <span>{truckLoad.acidType}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="font-semibold">🔒 Sampling Time:</span>
            <span>{truckLoad?.created ? new Date(truckLoad.created).toLocaleString() : 'N/A'}</span>
          </div>
          {#if assay.name.indexOf("ACID") == -1}
          <div class="flex justify-between items-center">
            <span class="font-semibold">🔢 Sample ID:</span>
            <span>{assay.name}</span>
          </div>
          {/if}
        </div>
      </div>
  
      <div class="flex justify-end">
        <button
          class="px-6 w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          type="button"
          on:click={handleComplete}
        >
          Complete Loading
        </button>
      </div>
    {:else}
      <div>Loading verification...</div>
    {/if}
</div>
  