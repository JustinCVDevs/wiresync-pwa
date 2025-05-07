<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { indexedDBService } from '$lib/services/indexedDBService';
	import Header from '$lib/components/Header.svelte';
	import { pocketbaseService } from '$lib/services/pocketbaseService';

  const RECEIVAL_ID = 'currentMarshalingReceival';

  export let data: PageData;
  let isOnline = navigator.onLine;
  let receivalData: any = null;
  let error = '';

  const goOnline = () => {
    isOnline = true;
    error = '';
  };
  const goOffline = () => {
    isOnline = false;
    error = 'Offline – changes will be saved locally';
  };

  onMount(async () => {

    try {
      // try to load from IndexedDB
      const record = await indexedDBService.getRecord('operationQueue', RECEIVAL_ID);
      if (record) {
        receivalData = record;
      } else {
        // fallback to localStorage and migrate
        const saved = localStorage.getItem(RECEIVAL_ID);
        if (saved) {
          receivalData = JSON.parse(saved);
          await indexedDBService.saveRecord('operationQueue', { id: RECEIVAL_ID, ...receivalData });
          localStorage.removeItem(RECEIVAL_ID);
        } else {
          goto('/processes/marshaling-receival');
        }
      }
    } catch (err) {
      console.error(err);
      error = 'Failed to load receival data';
    }

  
  });

  async function handleConfirm() {
    try {
      if (!isOnline) {
        // save offline
        await indexedDBService.saveRecord('operationQueue', { id: RECEIVAL_ID, ...receivalData });
        error = 'Offline – changes saved locally';
        goto('/processes');
        return;
      }
      // online: submit to server
      const res = await fetch('/api/marshaling-receival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receivalData)
      });
      if (!res.ok) throw new Error('API submission failed');
      await indexedDBService.deleteRecord('operationQueue', RECEIVAL_ID);
      goto('/processes');
    } catch (err) {
      console.error(err);
      error = 'Failed to submit receival data';
    }
  }

  
</script>

<div class="app-container" class:online={isOnline} class:offline={!isOnline}>
  <div class="verification-container">
    <h1>Verify Information</h1>
    <!-- verification details here -->

    <div class="button-group mt-4 space-x-2">
      <button class="verify-button" on:click={handleVerify}>Verify</button>
      <button class="confirm-button" on:click={handleConfirm}>Confirm</button>
    </div>

    {#if error}
      <p class="text-sm text-red-600 mt-2">{error}</p>
    {/if}
  </div>
</div>
