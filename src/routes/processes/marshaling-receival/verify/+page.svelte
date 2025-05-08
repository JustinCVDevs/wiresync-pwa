<script lang="ts">
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { indexedDBService } from '$lib/services/indexedDBService';
    import type { Wagon } from '$lib';
    import { goto } from '$app/navigation';

    let wagonData: Wagon | null = null;
    let error = '';
    let isEditing = false;

    onMount(async () => {
        try {
            const wagonId = $page.url.searchParams.get('id');
            if (!wagonId) {
                error = 'No wagon ID provided';
                return;
            }
            
            const record = await indexedDBService.getRecord('wagons', wagonId);
            wagonData = record || null; // Convert undefined to null
            
            if (!wagonData) {
                error = 'Wagon data not found';
            }
        } catch (err) {
            error = 'Failed to load wagon data';
            console.error(err);
        }
    });

    function onEdit() {
        isEditing = true;
    }

    async function onVerify() {
        if (!wagonData || !wagonData.id) return;
        
        try {
            // Update the record with verified data
            await indexedDBService.updateRecord('wagons', wagonData.id, {
                ...wagonData,
                syncStatus: 'pending',
                updated: new Date().toISOString()
            });
            
            // Redirect to completion page or process list
            goto('/processes');
        } catch (err) {
            error = 'Failed to update wagon data';
            console.error(err);
        }
    }

    // Add save function for edit mode
    async function onSave() {
        if (!wagonData || !wagonData.id) return;
        isEditing = false;
        
        try {
            await indexedDBService.updateRecord('wagons', wagonData.id, {
                ...wagonData,
                updated: new Date().toISOString()
            });
        } catch (err) {
            error = 'Failed to save changes';
            console.error(err);
        }
    }
</script>

<div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
    <h1 class="text-2xl font-bold mb-4 text-center">Wagon Details</h1>

    <div class="flex mb-6 text-sm font-medium text-gray-600">
        <div class="flex-1">Step 1: RFID Tag Linkage</div>
        <div class="flex-1 text-right">Step 2: Verification</div>
    </div>

    {#if error}
        <div class="error">{error}</div>
    {:else if wagonData}
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
                                bind:value={wagonData.transcoreTag}
                                class="font-medium text-gray-800 bg-transparent border-none focus:outline-none w-full"
                            />
                        {:else}
                            <span class="font-medium text-gray-800">{wagonData.transcoreTag}</span>
                        {/if}
                    </div>
                    <div class="flex items-center bg-white px-3 py-2 rounded border border-gray-200">
                        <span class="w-36 text-gray-600">Wagon ID/Nr.</span>
                        {#if isEditing}
                            <input 
                                name="wagonNumber"
                                type="text" 
                                bind:value={wagonData.wagonIdSimple}
                                class="font-medium text-gray-800 bg-transparent border-none focus:outline-none w-full"
                            />
                        {:else}
                            <span class="font-medium text-gray-800">{wagonData.wagonIdSimple}</span>
                        {/if}
                    </div>
                </div>
            </div>

            <div class="flex space-x-4">
                {#if isEditing}
                    <button
                        type="button"
                        on:click={onSave}
                        class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded"
                    >
                        Save
                    </button>
                {:else}
                    <button
                        type="button"
                        on:click={onEdit}
                        class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded"
                    >
                        Edit
                    </button>
                {/if}
                <button
                    type="button"
                    on:click={onVerify}
                    class="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 rounded"
                >
                    Verify
                </button>
            </div>
        </form>
    {:else}
        <div>Loading...</div>
    {/if}
</div>
  