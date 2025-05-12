<!-- CameraPicker.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	// Callback prop: parent passes a function to receive the File
	export let onPhotoSelected: (file: File) => void;
	export let initialFile: File | null = null;

	let videoEl: HTMLVideoElement;
	let stream: MediaStream | null = null;
	let previewUrl: string | null = null;
	let capturedFile: File | null = null;
	let hasCamera = false;
	let fileInput: HTMLInputElement;

	// Initialize with initial file if provided
	$: if (initialFile) {
		capturedFile = initialFile;
		previewUrl = URL.createObjectURL(initialFile);
	}

	// Cleanup object URLs when component unmounts
	onDestroy(() => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
	});

	// Check if camera is available
	async function checkCamera() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			hasCamera = devices.some((device) => device.kind === 'videoinput');
		} catch (error) {
			console.error('Failed to check camera availability:', error);
			hasCamera = false;
		}
	}

	// Initialize camera check
	checkCamera();

	// Handle file selection
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			if (file.type.startsWith('image/')) {
				if (previewUrl) {
					URL.revokeObjectURL(previewUrl);
				}
				previewUrl = URL.createObjectURL(file);
				onPhotoSelected(file);
			} else {
				alert('Please select an image file');
			}
		}
	}

	// Open device camera with error handling
	export async function openCamera() {
		try {
			// Try to get the camera stream without forcing environment mode
			stream = await navigator.mediaDevices.getUserMedia({
				video: true
			});
			videoEl.srcObject = stream;
		} catch (error) {
			console.error('Failed to access camera:', error);
			alert('Unable to access camera. Please ensure camera permissions are granted.');
		}
	}

	// Capture a frame, stop camera, set preview + notify parent
	export function capturePhoto() {
		if (!stream) return;

		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth;
		canvas.height = videoEl.videoHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.drawImage(videoEl, 0, 0);
		canvas.toBlob((blob) => {
			if (!blob) return;
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			capturedFile = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
			previewUrl = URL.createObjectURL(blob);
			onPhotoSelected(capturedFile);
			stopCamera();
		}, 'image/jpeg');
	}

	// Stop and clean up camera stream
	export function stopCamera() {
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}
</script>

<div class="space-y-4">
	<!-- 1) Camera/Upload options -->
	{#if hasCamera}
		<button
			type="button"
			class="w-full rounded bg-gray-800 px-4 py-2 text-white hover:bg-blue-700"
			on:click={openCamera}
		>
			Take Photo
		</button>
	{:else}
		<input
			type="file"
			accept="image/*"
			bind:this={fileInput}
			on:change={handleFileSelect}
			class="hidden"
		/>
		<button
			type="button"
			class="w-full rounded bg-gray-800 px-4 py-2 text-white hover:bg-blue-700"
			on:click={() => fileInput.click()}
		>
			Upload Photo
		</button>
	{/if}

	<!-- 2) Live video while streaming -->
	{#if stream}
		<video bind:this={videoEl} autoplay playsinline class="w-full max-w-xs rounded shadow-md" />
		<div class="flex gap-2">
			<button
				type="button"
				class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
				on:click={capturePhoto}
			>
				Capture
			</button>
			<button
				type="button"
				class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
				on:click={stopCamera}
			>
				Cancel
			</button>
		</div>
	{/if}

	<!-- 3) Show preview if captured -->
	{#if previewUrl}
		<img
			src={previewUrl}
			alt="Captured photo preview"
			class="mx-auto w-full max-w-xs rounded shadow-inner"
		/>
	{/if}
</div>
