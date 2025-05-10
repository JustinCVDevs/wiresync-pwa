<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { indexedDBService } from '$lib/services/indexedDBService';
    import type { Assay } from '$lib/types';
    import type { TruckLoad } from '$lib/types/truckLoad';

    let assayId = $page.url.searchParams.get('assayId') || '';
    let assay: Assay | undefined;
    let linkedTrucks: any[] = [];
    let error = '';
    let isLoading = true;
    let truckLoads: TruckLoad[] = [];

    async function loadAssayData() {
        try {
            const assayData = await indexedDBService.getRecord('assays', assayId);
            if (!assayData) {
                error = 'Assay not found';
                return;
            }
            assay = assayData;
            
            // Load truck loads if assay has linked loads
            if (assay.linkedTruckLoadIds?.length) {
                const loads = await Promise.all(
                    assay.linkedTruckLoadIds.map(id => 
                        indexedDBService.getRecord('truckLoads', id)
                    )
                );
                truckLoads = loads.filter((load): load is TruckLoad => load !== undefined);
            }
        } catch (err) {
            error = 'Failed to load data';
            console.error(err);
        } finally {
            isLoading = false;
        }
    }

    function handleNewTruck() {
        if (!assay) return;
        goto(`/processes/gravelotte/add-trucks/new?assayId=${assay.id}`);
    }

    function handleCancel() {
        goto('/processes');
    }

    // Add this function in the script section
    function handleCompleteLoading() {
        goto('/processes');
    }

    function formatDate(dateString: string | undefined) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString();
    }

    $: if (assayId) {
        loadAssayData();
    }
</script>

<div class="container">
    <h1>Adding Trucks to a Lot</h1>

    {#if error}
        <div class="error">{error}</div>
    {/if}

    {#if isLoading}
        <div class="text-center">Loading...</div>
    {:else if assay}
        <div class="sampling-details">
            <h2>Sampling Details</h2>
            <div class="details-grid">
                <div class="detail-item">
                    <label>Total Trucks Linked</label>
                    <span class="value">{truckLoads.length}</span>
                </div>
                <div class="detail-item">
                    <label>Sample Batch Created</label>
                    <span class="value">{formatDate(assay.created)}</span>
                </div>
                <div class="detail-item">
                    <label>Dedicated Fleet</label>
                    <span class="value">{assay.dedicatedFleet ? 'Yes' : 'No'}</span>
                </div>
                <div class="detail-item">
                    <label>Sample ID</label>
                    <span class="value">{assay.name}</span>
                </div>
                {#if !assay.dedicatedFleet}
                    <div class="detail-item">
                        <label>Sample Size</label>
                        <span class="value">{assay.sampleSize}</span>
                    </div>
                    <div class="detail-item">
                        <label>Commodity</label>
                        <span class="value">{assay.commodity}</span>
                    </div>
                    <div class="detail-item">
                        <label>Product Type</label>
                        <span class="value">{assay.productType}</span>
                    </div>
                {/if}
            </div>
        </div>

        <div class="button-group">
            <button class="cancel-button" on:click={handleCancel}>Cancel</button>
            <button class="new-button" on:click={handleNewTruck}>+ NEW Truck</button>
            {#if truckLoads.length > 0}
                <button class="complete-button" on:click={handleCompleteLoading}>Complete Loading</button>
            {/if}
        </div>
    {/if}

    {#if truckLoads.length > 0}
        <div class="truck-loads">
            <h2>Linked Trucks ({truckLoads.length})</h2>
            <div class="loads-grid">
                {#each truckLoads as load}
                    <div class="load-card">
                        <div class="load-detail">
                            <label>Truck ID</label>
                            <span>{load.truckId}</span>
                        </div>
                        <div class="load-detail">
                            <label>FEL Weight</label>
                            <span>{load.felWeight} kg</span>
                        </div>
                        <div class="load-detail">
                            <label>Sample Status</label>
                            <span>{load.samplingStatus ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="load-detail">
                            <label>Loading Location</label>
                            <span>{load.loadingLocation}</span>
                        </div>
                        <div class="load-detail">
                            <label>Loading Hour</label>
                            <span>{load.loadingHour}</span>
                        </div>
                        <div class="load-detail">
                            <label>Created</label>
                            <span>{formatDate(load.created)}</span>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }

    .sampling-details {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 2rem 0;
    }

    h2 {
        margin-top: 0;
        margin-bottom: 1.5rem;
        color: #333;
    }

    .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .detail-item label {
        font-weight: bold;
        color: #666;
    }

    .detail-item .value {
        font-size: 1.1rem;
        color: #333;
    }

    .button-group {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
    }

    button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        color: white;
    }

    .new-button {
        background-color: #2196f3;
    }

    .cancel-button {
        background-color: #f44336;
    }

    .error {
        background-color: #ffebee;
        color: #c62828;
        padding: 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
    }

    .truck-loads {
        margin-top: 2rem;
    }

    .loads-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .load-card {
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1rem;
    }

    .load-detail {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #eee;
    }

    .load-detail:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }

    .load-detail label {
        color: #666;
    }

    .load-detail span {
        font-weight: 500;
        color: #333;
    }

    .complete-button {
        background-color: #4caf50;
        margin-left: auto;
    }
</style>
