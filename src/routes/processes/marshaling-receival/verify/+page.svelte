<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { indexedDBService } from '$lib/services/indexedDBService';
	import Header from '$lib/components/Header.svelte';

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

//   onMount(async () => {

//     try {
//       // try to load from IndexedDB
//       const record = await indexedDBService.getRecord('operationQueue', RECEIVAL_ID);
//       if (record) {
//         receivalData = record;
//       } else {
//         // fallback to localStorage and migrate
//         const saved = localStorage.getItem(RECEIVAL_ID);
//         if (saved) {
//           receivalData = JSON.parse(saved);
//           await indexedDBService.saveRecord('operationQueue', { id: RECEIVAL_ID, ...receivalData });
//           localStorage.removeItem(RECEIVAL_ID);
//         } else {
//           goto('/processes/marshaling-receival');
//         }
//       }
//     } catch (err) {
//       console.error(err);
//       error = 'Failed to load receival data';
//     }

//     return () => {
//       window.removeEventListener('online', goOnline);
//       window.removeEventListener('offline', goOffline);
//     };
//   });

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

  function handleVerify() {
    const date = new Date();
    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yy = date.getFullYear().toString().slice(-2);
    const transactionName = `${dd}${mm}${yy}_${data.wagonId}_SIMPLE`;
    createWireTransaction({ name: transactionName, componentType: 'WAGON' });
  }

  async function createWireTransaction(tx: { name: string; componentType: string }) {
    try {
      const response = await fetch('/api/wire/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      if (!response.ok) throw new Error('Failed to create WIRE transaction');
      // success handling...
    } catch (err) {
      console.error('Error creating WIRE transaction:', err);
    }
  }
</script>

<div class="app-container" class:online={isOnline} class:offline={!isOnline}>
	<Header />
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
