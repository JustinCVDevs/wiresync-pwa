<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Camera from '$lib/components/Camera.svelte';
	import Header from '$lib/components/Header.svelte';
	import RfidReader from '$lib/components/RFIDReader.svelte';

	let isOnline = navigator.onLine;
	let transcoreTag = '';
	let wagonId = '';
	let capturedImage: string | null = null;
	let error = '';
	let showCamera = false;

	onMount(() => {
		loadPersistedData();
		window.addEventListener('online', () => {
			isOnline = true;
			error = '';
		});
		window.addEventListener('offline', () => {
			isOnline = false;
			error = 'Application is offline - data will be submitted when connection is restored';
		});

		return () => {
			window.removeEventListener('online', () => (isOnline = true));
			window.removeEventListener('offline', () => (isOnline = false));
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
		if (!transcoreTag || !wagonId) {
			alert('Please fill all required fields');
			return;
		}

		const receivalData = {
			transcoreTag,
			wagonId,
			capturedImage,
			timestamp: new Date().toISOString(),
			componentType: 'MARSHALING_RECEIVAL'
		};

		localStorage.setItem('currentMarshalingReceival', JSON.stringify(receivalData));
		goto('/processes/marshaling-receival/verify');
	}

	function loadPersistedData() {
		const savedData = localStorage.getItem('currentMarshalingReceival');
		if (savedData) {
			const data = JSON.parse(savedData);
			transcoreTag = data.transcoreTag;
			wagonId = data.wagonId;
			capturedImage = data.capturedImage;
		}
	}

	onMount(() => {
		loadPersistedData();
	});
</script>
<Header/>
<main class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
  <section class="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-6">
    
    <!-- Breadcrumb -->
    <div class="text-sm text-gray-600">
      PMC &gt; Marshaling Receival &gt; <span class="font-medium text-gray-900">New Process</span>
    </div>
    
    <h1 class="text-center text-2xl font-semibold text-gray-900">Marshaling Receival</h1>

    <div class="space-y-4">
     <RfidReader>

      <div class="flex flex-col">
        <label for="wagonId" class="mb-1 text-gray-700 font-medium">Wagon ID</label>
        <input
          id="wagonId"
          type="text"
          bind:value={wagonId}
          placeholder="Enter Wagon ID"
          class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <Camera
        {showCamera}
        on:capture={handleCapture}
        on:close={handleCameraClose}
      />

      {#if capturedImage}
        <div class="space-y-4">
          <div class="image-preview rounded-lg overflow-hidden border border-gray-200">
            <img src={capturedImage} alt="Captured wagon" class="w-full object-cover" />
          </div>
          <button
            class="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 active:bg-gray-900 transition"
            on:click={() => (showCamera = true)}
          >
            Retake Photo
          </button>
        </div>
      {:else}
        <button
          class="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 active:bg-gray-900 transition"
          on:click={() => (showCamera = true)}
        >
          Open Camera
        </button>
      {/if}

    <div class="flex space-x-4">
      <button
        class="flex-1 bg-red-700 text-white py-3 rounded-lg font-medium hover:bg-red-600 active:bg-red-800 transition"
        on:click={handleCancel}
      >
        Cancel
      </button>
      <button
        class="flex-1 bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-600 active:bg-green-800 transition"
        on:click={handleSubmit}
      >
        Submit
      </button>
    </div>
</main>