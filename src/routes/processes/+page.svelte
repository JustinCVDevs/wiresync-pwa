<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    let isOnline = navigator.onLine;

    onMount(() => {
        window.addEventListener('online', () => isOnline = true);
        window.addEventListener('offline', () => isOnline = false);

        return () => {
            window.removeEventListener('online', () => isOnline = true);
            window.removeEventListener('offline', () => isOnline = false);
        };
    });

    const processes = [
        'Marshaling Receival',
        'Marshaling Dispatch',
        'West Loadout (Wagons)',
        'East Loadout (Wagons)',
        'Gravelotte (Trucks)',
        'Truck Loadout',
        'Copper Truck Loadout',
        'Acid Truck'
    ] as const;

    function handleProcessSelect(process: string) {
        if (process === 'Marshaling Receival') {
            goto('/processes/marshaling-receival');
        } else if (process === 'Marshaling Dispatch') {
            goto('/processes/marshaling-dispatch');
        } else if (process === 'West Loadout (Wagons)') {
            goto('/processes/west-loadout');
        } else if (process === 'East Loadout (Wagons)') {
            goto('/processes/east-loadout');
        } else if (process === 'Truck Loadout') {
            goto('/processes/truck-loadout');
        } else if (process === 'Copper Truck Loadout') {
            goto('/processes/copper-truck-loadout');
        } else if (process === 'Acid Truck') {
            goto('/processes/acid-truck');
        }
    }
        // Add other process routes as needed
    
</script>

<div class="app-container" class:online={isOnline} class:offline={!isOnline}>
    <div class="process-selector">
        <h1>Select Process</h1>
        <div class="process-list">
            {#each processes as process}
                <button class="process-button" on:click={() => handleProcessSelect(process)}>
                    {process}
                </button>
            {/each}
        </div>
    </div>
</div>

<style>
    .app-container {
        min-height: 100vh;
        border: 8px solid;
        margin: 0;
        padding: 1rem;
        box-sizing: border-box;
    }

    .online {
        border-color: #4CAF50;
    }

    .offline {
        border-color: #FF9800;
    }

    .process-selector {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
    }

    .process-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 400px;
        margin-top: 2rem;
    }

    .process-button {
        padding: 1rem;
        font-size: 1.2rem;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .process-button:hover {
        background-color: #1976D2;
    }
</style>