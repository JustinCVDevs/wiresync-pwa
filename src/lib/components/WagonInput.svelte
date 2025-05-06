<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Camera from './Camera.svelte';

    export let wagonId = '';
    export let rfidTag = '';

    let showCamera = false;
    let capturedImage: string | null = null;
    
    const dispatch = createEventDispatcher<{
        submit: { wagonId: string; rfidTag: string; image: string | null };
        cancel: void;
    }>();

    function handleSubmit() {
        dispatch('submit', { wagonId, rfidTag, image: capturedImage });
    }

    function handleCancel() {
        dispatch('cancel');
    }

    function handleCapture(event: CustomEvent<string>) {
        capturedImage = event.detail;
    }
</script>

<div class="wagon-input">
    <div class="input-group">
        <label for="rfidTag">RFID Tag</label>
        <input 
            id="rfidTag"
            type="text"
            bind:value={rfidTag}
            placeholder="Scan or enter RFID tag"
        />
    </div>

    <div class="input-group">
        <label for="wagonId">Wagon ID</label>
        <input 
            id="wagonId"
            type="text"
            bind:value={wagonId}
            placeholder="Enter Wagon ID"
        />
    </div>

    <Camera 
        {showCamera} 
        on:capture={handleCapture}
        on:close={() => showCamera = false}
    />

    {#if capturedImage}
        <div class="image-preview">
            <img src={capturedImage} alt="Captured wagon" />
            <button class="camera-button" on:click={() => showCamera = true}>
                Retake Photo
            </button>
        </div>
    {:else}
        <button class="camera-button" on:click={() => showCamera = true}>
            Open Camera
        </button>
    {/if}

    <div class="button-group">
        <button class="cancel-button" on:click={handleCancel}>Cancel</button>
        <button class="submit-button" on:click={handleSubmit}>Submit Wagon</button>
    </div>
</div>

<style>
    .wagon-input {
        margin: 1rem 0;
    }

    .input-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        font-size: 1.1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .button-group {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
    }

    button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        color: white;
    }

    .submit-button {
        background-color: #4CAF50;
    }

    .cancel-button {
        background-color: #f44336;
    }

    .camera-button {
        background-color: #2196F3;
    }
</style>