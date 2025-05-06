<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher<{
        capture: string;
        close: void;
    }>();

    export let showCamera = false;
    
    let videoStream: MediaStream | null = null;
    let videoElement: HTMLVideoElement;

    async function openCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            videoStream = stream;
            if (videoElement) {
                videoElement.srcObject = stream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    }

    function capturePhoto() {
        if (videoElement) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(videoElement, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg');
                dispatch('capture', imageData);
                closeCamera();
            }
        }
    }

    function closeCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        dispatch('close');
    }

    $: if (showCamera) {
        openCamera();
    }
</script>

{#if showCamera}
    <div class="camera-container">
        <video 
            bind:this={videoElement} 
            autoplay 
            playsinline
            class="camera-preview"
        >
            <track kind="captions" label="Camera Feed" />
        </video>
        <div class="camera-controls">
            <button class="cancel-button" on:click={closeCamera}>
                Cancel
            </button>
            <button class="capture-button" on:click={capturePhoto} aria-label="Take photo">
            </button>
        </div>
    </div>
{/if}

<style>
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

    .cancel-button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
</style>