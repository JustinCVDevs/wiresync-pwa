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
	let availableCameras: MediaDeviceInfo[] = [];
	let selectedCameraId: string = '';
	let isTorchOn = false;
	let isDesktop = !navigator.userAgent.match(/Mobi/i);

	async function checkCamera() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			availableCameras = devices.filter(device => device.kind === 'videoinput');
			hasCamera = availableCameras.length > 0;
			selectedCameraId = availableCameras[0]?.deviceId || '';
		} catch (error) {
			console.error('Camera enumeration failed:', error);
		}
	}

	async function openCamera(deviceId?: string) {
		try {
			const constraints: MediaStreamConstraints = {
				video: {
					deviceId: deviceId ? { exact: deviceId } : undefined,
					advanced: [{ torch: isTorchOn } as any]
				}
			};
			
			stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoEl.srcObject = stream;
		} catch (error) {
			console.error('Camera access failed:', error);
		}
	}

	function toggleTorch() {
		if (stream) {
			isTorchOn = !isTorchOn;
			const track = stream.getVideoTracks()[0];
			track.applyConstraints({ advanced: [{ torch: isTorchOn } as any] });
		}
	}

	function switchCamera(deviceId: string) {
		stopCamera();
		openCamera(deviceId);
	}

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
	{#if hasCamera && !isDesktop}
		<button 
			type="button"
			class="w-full rounded px-4 py-2 text-white hover:bg-blue-700"
			style="background-color: #444446;"
			on:click={() => openCamera(selectedCameraId)}
		>
			Take Photo
		</button>
		
		{#if availableCameras.length > 1}
			<select 
				bind:value={selectedCameraId}
				on:change={() => switchCamera(selectedCameraId)}
				class="w-full rounded bg-gray-700 p-2 text-white"
			>
				{#each availableCameras as camera, $index}
					<option value={camera.deviceId}>{camera.label || 'Camera ' + ($index + 1)}</option>
				{/each}
			</select>
		{/if}
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
			class="w-full text-sm rounded bg-gray px-4 py-2 text-white font-semibold hover:bg-blue-700"
			style="background: #444446"
			on:click={() => fileInput.click()}
		>
			Upload Photo
		</button>
	{/if}

	{#if stream}
		<div class="space-y-2">
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
					class="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
					on:click={toggleTorch}
				>
					{isTorchOn ? 'Flash Off' : 'Flash On'}
				</button>
				<button
					type="button"
					class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
					on:click={stopCamera}
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	{#if previewUrl}
		<img
			src={previewUrl}
			alt="Captured photo preview"
			class="mx-auto w-full max-w-xs rounded shadow-inner"
		/>
	{/if}
</div>
