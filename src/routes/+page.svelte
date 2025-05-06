<script>
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

    function selectLocation() {
        goto('/processes');
    }
</script>

<div class="app-container" class:online={isOnline} class:offline={!isOnline}>
    <div class="location-selector">
        <h1>Select Location</h1>
        <button class="location-button" on:click={selectLocation}>
            PMC
        </button>
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

    .location-selector {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
    }

    .location-button {
        padding: 1rem 3rem;
        font-size: 1.5rem;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .location-button:hover {
        background-color: #1976D2;
    }
</style>
