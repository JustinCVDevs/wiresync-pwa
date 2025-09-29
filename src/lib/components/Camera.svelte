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

	// Resize image to ensure it doesn't exceed 1MB
	async function resizeImageToMaxSize(file: File, maxSizeInMB: number = 1): Promise<File> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					let width = img.width;
					let height = img.height;
					
					// Calculate size and determine if resizing is needed
					const MAX_SIZE_BYTES = maxSizeInMB * 1024 * 1024;
					
					// Start with original dimensions
					let quality = 0.9; // Initial quality
					let resizeRatio = 1;
					
					// If the image is very large, we need to resize dimensions
					if (width > 1920 || height > 1920) {
						resizeRatio = 1920 / Math.max(width, height);
						width = Math.floor(width * resizeRatio);
						height = Math.floor(height * resizeRatio);
					}
					
					canvas.width = width;
					canvas.height = height;
					
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						reject(new Error('Could not get canvas context'));
						return;
					}
					
					// Draw image on canvas with new dimensions
					ctx.drawImage(img, 0, 0, width, height);
					
					// Convert to blob with adjusted quality
					canvas.toBlob((blob) => {
						if (!blob) {
							reject(new Error('Failed to create blob from canvas'));
							return;
						}
						
						// Create a new File from the blob
						const resizedFile = new File(
							[blob],
							file.name,
							{ type: 'image/jpeg', lastModified: new Date().getTime() }
						);
						
						console.log(`Original size: ${(file.size / (1024 * 1024)).toFixed(2)}MB, Resized: ${(resizedFile.size / (1024 * 1024)).toFixed(2)}MB`);
						resolve(resizedFile);
					}, 'image/jpeg', quality);
				};
				img.onerror = () => reject(new Error('Failed to load image'));
				img.src = e.target?.result as string;
			};
			reader.onerror = () => reject(new Error('Failed to read file'));
			reader.readAsDataURL(file);
		});
	}
	
	// Handle file selection
	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			if (file.type.startsWith('image/')) {
				try {
					// Clean up previous preview
					if (previewUrl) {
						URL.revokeObjectURL(previewUrl);
					}
					
					// Check file size and resize if needed
					const fileSizeInMB = file.size / (1024 * 1024);
					let fileToUse = file;
					
					if (fileSizeInMB > 1) {
						console.log(`Image too large (${fileSizeInMB.toFixed(2)}MB), resizing...`);
						fileToUse = await resizeImageToMaxSize(file);
					}
					
					// Create preview
					previewUrl = URL.createObjectURL(fileToUse);
					// Pass the processed file to parent
					onPhotoSelected(fileToUse);
				} catch (error) {
					console.error('Error processing image:', error);
					alert('Failed to process image. Please try again.');
				}
			} else {
				alert('Please select an image file');
			}
		}
	}


	// Capture a frame, stop camera, set preview + notify parent
	export async function capturePhoto() {
		if (!stream) return;

		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth;
		canvas.height = videoEl.videoHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.drawImage(videoEl, 0, 0);
		canvas.toBlob(async (blob) => {
			if (!blob) return;
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			
			// Create file from blob
			const rawFile = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
			
			// Check file size and resize if needed
			const fileSizeInMB = rawFile.size / (1024 * 1024);
			let fileToUse = rawFile;
			
			try {
				if (fileSizeInMB > 1) {
					console.log(`Captured image too large (${fileSizeInMB.toFixed(2)}MB), resizing...`);
					fileToUse = await resizeImageToMaxSize(rawFile);
				}
				
				capturedFile = fileToUse;
				previewUrl = URL.createObjectURL(fileToUse);
				onPhotoSelected(capturedFile);
			} catch (error) {
				console.error('Error resizing captured image:', error);
				// Fall back to original image if resize fails
				capturedFile = rawFile;
				previewUrl = URL.createObjectURL(rawFile);
				onPhotoSelected(capturedFile);
			}
			
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
			<video bind:this={videoEl} autoplay playsinline class="w-full max-w-xs rounded shadow-md">
				<!-- Add caption track for accessibility -->
				<track kind="captions" src="" label="English" />
			</video>
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
			alt=""
			class="mx-auto w-full max-w-xs rounded shadow-inner"
		/>
	{/if}
</div>
