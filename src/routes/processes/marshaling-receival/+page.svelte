<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import Camera from '$lib/components/Camera.svelte';
    
    let isOnline = navigator.onLine;
    let transcoreTag = '';
    let wagonId = '';
    let capturedImage: string | null = null;
    let showCamera = false;

    onMount(() => {
        window.addEventListener('online', () => isOnline = true);
        window.addEventListener('offline', () => isOnline = false);

        return () => {
            window.removeEventListener('online', () => isOnline = true);
            window.removeEventListener('offline', () => isOnline = false);
        };
    });

    function handleCapture(event: CustomEvent<string>) {
        capturedImage = event.detail;
    }

    function handleCameraClose() {
        showCamera = false;
    }

    function handleCancel() {
        goto('/processes');
    }

    function handleSubmit() {
        goto(`/processes/marshaling-receival/verify?wagonId=${wagonId}`);
    }
</script>

<div class="app-container" class:online={isOnline} class:offline={!isOnline}>
    <div class="form-container">
        <h1>Marshaling Receival</h1>
        
        <div class="input-group">
            <label for="rfid">RFID Tag (TRANSCORE_TAG)</label>
            <input 
                id="rfid"
                type="text"
                bind:value={transcoreTag}
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
            on:close={handleCameraClose}
        />

        {#if capturedImage}
            <div class="image-preview">
                <img src={capturedImage} alt="Captured wagon" />
                <div class="button-group">
                    <button class="camera-button" on:click={() => showCamera = true}>
                        Retake Photo
                    </button>
                </div>
            </div>
        {:else}
            <button class="camera-button" on:click={() => showCamera = true}>
                Open Camera
            </button>
        {/if}

        <div class="button-group">
            <button class="cancel-button" on:click={handleCancel}>
                Cancel
            </button>
            <button class="submit-button" on:click={handleSubmit}>
                Submit
            </button>
        </div>
    </div>
</div>

<style>
    /* Remove camera-related styles as they're now in the Camera component */
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

    .form-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
    }

    .input-group {
        margin-bottom: 1.5rem;
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

    .camera-button {
        background-color: #2196F3;
    }

    .submit-button {
        background-color: #4CAF50;
    }

    .cancel-button {
        background-color: #f44336;
    }

    .camera-container {
        position: relative;
        width: 100%;
        max-width: 600px;
        height: 400px;
        background: black;
        border-radius: 8px;
        overflow: hidden;
        margin: 1rem 0;
    }

    .camera-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .camera-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1rem;
        display: flex;
        justify-content: space-around;
        background: rgba(0, 0, 0, 0.7);
    }

    .capture-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: #fff;
        border: 3px solid #4CAF50;
        padding: 0;
        cursor: pointer;
        position: relative;
    }

    .capture-button::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: #4CAF50;
        transition: all 0.2s;
    }

    .capture-button:hover::after {
        width: 44px;
        height: 44px;
    }

    .camera-button {
        background-color: #2196F3;
        margin: 1rem 0;
    }

    .cancel-button {
        background-color: #f44336;
        color: white;
    }
    .image-preview {
        margin: 1rem 0;
        text-align: center;
    }

    .image-preview img {
        max-width: 100%;
        max-height: 300px;
        margin-bottom: 1rem;
        border-radius: 4px;
    }
</style>