<script lang="ts">
		import { enhance } from '$app/forms';

	let { data, form } = $props();
	let rfidNumber = $state(data.wagonrfid);
	let wagonNumber = $state(data.wagonId);
	let isEditing = $state(false);
	
	function onEdit() {
 		isEditing = true;
	}
  
	function onVerify() {
	  // handle verify
	}
  </script>
  <div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
	<h1 class="text-2xl font-bold mb-4 text-center">Wagon Details</h1>
  
	<div class="flex mb-6 text-sm font-medium text-gray-600">
	  <div class="flex-1">Step 1: RFID Tag Linkage</div>
	  <div class="flex-1 text-right">Step 2: Verification</div>
	</div>
<form method="POST" use:enhance>
  <div class="bg-gray-50 p-4 rounded border border-gray-200 mb-6">
    <p class="text-gray-900 mb-3 text-xl">Verification</p>
    <p class="text-gray-700 mb-4">Please verify results below.</p>
    <div class="space-y-3">
      <div class="flex items-center bg-white px-3 py-2 rounded border border-gray-200">
        <span class="w-36 text-gray-600">Wagon RFID Nr.</span>
        {#if isEditing}
          <input 
            name="rfidNumber"
            type="text" 
            bind:value={rfidNumber}
            class="font-medium text-gray-800 bg-transparent border-none focus:outline-none w-full"
          />
        {:else}
          <span class="font-medium text-gray-800">{rfidNumber}</span>
        {/if}
      </div>
      <div class="flex items-center bg-white px-3 py-2 rounded border border-gray-200">
        <span class="w-36 text-gray-600">Wagon ID/Nr.</span>
		{wagonNumber}
		{data.wagonId}
        {#if isEditing}
          <input 
            name="wagonNumber"
            type="text" 
            bind:value={wagonNumber}
            class="font-medium text-gray-800 bg-transparent border-none focus:outline-none w-full"
          />
        {:else}
          <span class="font-medium text-gray-800">{wagonNumber}</span>
        {/if}
      </div>
    </div>
  </div>

  <div class="flex space-x-4">
    <button
      type="button"
      onclick={onEdit}
      class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded"
    >
      Edit
    </button>
    <button
      type="submit"
      class="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 rounded"
    >
      Verify
    </button>
  </div>
</form>

  
	
  </div>
  