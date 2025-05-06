<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    let assayData: any = null;
    let linkedTrucks: any[] = [];
    let error = '';

    onMount(() => {
        const storedData = localStorage.getItem('currentTruckAssay');
        if (storedData) {
            assayData = JSON.parse(storedData);
            const storedTrucks = localStorage.getItem(`trucks_${assayData.sampleId}`);
            if (storedTrucks) {
                linkedTrucks = JSON.parse(storedTrucks);
            }
        }
    });

    function handleNewTruck() {
        goto(`/processes/truck-loadout/add-trucks/new?sampleId=${assayData.sampleId}`);
    }

    function handleCancel() {
        goto('/processes');
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleString();
    }
</script>

<div class="container">
    <h1>Adding Trucks to a Lot</h1>

    {#if error}
        <div class="error">{error}</div>
    {/if}

    {#if assayData}
        <div class="sampling-details">
            <h2>Sampling Details</h2>
            <div class="details-grid">
                <div class="detail-item">
                    <label>Total Trucks Linked</label>
                    <span class="value">{linkedTrucks.length}</span>
                </div>
                <div class="detail-item">
                    <label>Sample Batch Created</label>
                    <span class="value">{formatDate(assayData.timestamp)}</span>
                </div>
                <div class="detail-item">
                    <label>Dedicated Fleet</label>
                    <span class="value">{assayData.isDedicatedFleet}</span>
                </div>
                <div class="detail-item">
                    <label>Sample ID</label>
                    <span class="value">{assayData.sampleId}</span>
                </div>
                {#if assayData.isDedicatedFleet === 'No'}
                    <div class="detail-item">
                        <label>Sample Size</label>
                        <span class="value">{assayData.sampleSize}</span>
                    </div>
                    <div class="detail-item">
                        <label>Commodity</label>
                        <span class="value">{assayData.commodity}</span>
                    </div>
                    <div class="detail-item">
                        <label>Product Type</label>
                        <span class="value">{assayData.productType}</span>
                    </div>
                {/if}
            </div>
        </div>

        <div class="button-group">
            <button class="cancel-button" on:click={handleCancel}>Cancel</button>
            <button class="new-button" on:click={handleNewTruck}>+ NEW Truck</button>
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
        background-color: #2196F3;
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
</style>