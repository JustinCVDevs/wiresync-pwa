<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    let truckData: any = null;
    let error = '';

    onMount(() => {
        const storedData = localStorage.getItem('currentAcidTruck');
        if (storedData) {
            truckData = JSON.parse(storedData);
        }
    });

    function handleNewTruck() {
        goto('/processes/acid-truck');
    }

    function handleCompleteLoading() {
        // In a real application, this would make an API call to finalize the transaction
        localStorage.removeItem('currentAcidTruck');
        goto('/processes');
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleString();
    }
</script>

<div class="container">
    <h1>Review Acid Truck Details</h1>

    {#if error}
        <div class="error">{error}</div>
    {/if}

    {#if truckData}
        <div class="truck-details">
            <h2>Transaction Details</h2>
            <div class="details-grid">
                <div class="detail-item">
                    <label>Truck Registration</label>
                    <span class="value">{truckData.truckRegistration}</span>
                </div>
                <div class="detail-item">
                    <label>Tank Location</label>
                    <span class="value">{truckData.tankLocation}</span>
                </div>
                <div class="detail-item">
                    <label>Acid Type</label>
                    <span class="value">{truckData.acidType}</span>
                </div>
                {#if truckData.sampleId}
                    <div class="detail-item">
                        <label>Sample ID</label>
                        <span class="value">{truckData.sampleId}</span>
                    </div>
                {/if}
                <div class="detail-item">
                    <label>Timestamp</label>
                    <span class="value">{formatDate(truckData.timestamp)}</span>
                </div>
            </div>

            {#if truckData.image}
                <div class="image-section">
                    <h3>Captured Image</h3>
                    <div class="captured-image">
                        <img src={truckData.image} alt="Truck registration" />
                    </div>
                </div>
            {/if}
        </div>

        <div class="button-group">
            <button class="new-button" on:click={handleNewTruck}>New Truck</button>
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

    .truck-details {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 2rem 0;
    }

    h2, h3 {
        margin-top: 0;
        margin-bottom: 1.5rem;
        color: #333;
    }

    .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
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

    .image-section {
        margin-top: 2rem;
    }

    .captured-image {
        border: 1px solid #ccc;
        border-radius: 4px;
        overflow: hidden;
    }

    .captured-image img {
        width: 100%;
        height: auto;
        display: block;
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

    .error {
        background-color: #ffebee;
        color: #c62828;
        padding: 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
    }
</style>