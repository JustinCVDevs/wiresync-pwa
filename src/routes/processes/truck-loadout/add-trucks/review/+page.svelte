<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    const sampleId = $page.url.searchParams.get('sampleId') || '';
    let currentTruck: any = null;
    let error = '';

    onMount(() => {
        const trucks = JSON.parse(localStorage.getItem(`trucks_${sampleId}`) || '[]');
        currentTruck = trucks[trucks.length - 1];
    });

    function handleNewTruck() {
        goto(`/processes/truck-loadout/add-trucks/new?sampleId=${sampleId}`);
    }

    function handleCompleteLoading() {
        goto('/processes');
    }

    function handleCancel() {
        goto('/processes');
    }
</script>

<div class="container">
    <h1>Review Truck Details</h1>
    <p class="sample-id">Sample ID: {sampleId}</p>

    {#if error}
        <div class="error">{error}</div>
    {/if}

    {#if currentTruck}
        <div class="truck-details">
            <h2>Latest Truck Details</h2>
            <div class="details-grid">
                <div class="detail-item">
                    <label>Truck Registration</label>
                    <span class="value">{currentTruck.truckRegistration}</span>
                </div>
                <div class="detail-item">
                    <label>FEL Weight</label>
                    <span class="value">{currentTruck.felWeight} kg</span>
                </div>
                <div class="detail-item">
                    <label>Sampling Status</label>
                    <span class="value">{currentTruck.samplingStatus}</span>
                </div>
                <div class="detail-item">
                    <label>Loading Location</label>
                    <span class="value">{currentTruck.loadingLocation}</span>
                </div>
            </div>
        </div>

        <div class="button-group">
            <button class="cancel-button" on:click={handleCancel}>Cancel</button>
            <button class="new-button" on:click={handleNewTruck}>+ NEW Truck</button>
            <button class="complete-button" on:click={handleCompleteLoading}>Complete Loading</button>
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }

    .sample-id {
        font-size: 1.2rem;
        margin-bottom: 2rem;
        font-weight: bold;
    }

    .truck-details {
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

    .complete-button {
        background-color: #4CAF50;
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