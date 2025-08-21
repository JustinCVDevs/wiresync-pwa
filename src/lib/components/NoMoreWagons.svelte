<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    export let message: string = "All wagons have been weighed";
    export let onOk: () => void = () => {};

    const dispatch = createEventDispatcher();

    function handleOk() {
        onOk();
        dispatch('ok');
    }
</script>

<div class="popup-overlay">
    <div class="popup-content">
        <div class="popup-message">
            {message}
        </div>
        <button class="popup-button" on:click={handleOk}>OK</button>
    </div>
</div>

<style>
    .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .popup-content {
        background: white;
        padding: 2rem 2.5rem;
        max-width: 70vw;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .popup-message {
        font-size: 1.2rem;
        margin-bottom: 1.5rem;
        color: #374151;
    }
    .popup-button {
        padding: 0.5rem 2rem;
        border: none;
        border-radius: 6px;
        background: #2563eb;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
    }
    .popup-button:hover {
        background: #1d4ed8;
    }
</style>