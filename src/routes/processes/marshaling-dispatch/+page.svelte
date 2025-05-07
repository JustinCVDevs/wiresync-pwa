<script lang="ts">
	import { onMount } from 'svelte';
	import Camera from '$lib/components/Camera.svelte';
	import { goto } from '$app/navigation';

	interface Train {
		TRAIN_REF_NR: string;
		consignments?: string[];
		TRAIN_RFID_NR?: string;
	}

	let isOnline = navigator.onLine;
	let trainRefNumbers: string[] = [];
	let consignmentNumbers: string[] = [];
	let trainRfidNumbers: string[] = [];

	let selectedTrainRef = '';
	let selectedConsignment = '';
	let manualConsignment = '';
	let selectedTrainRfid = '';
	let manualTrainRfid = '';
	let capturedImage: string | null = null;
	let showCamera = false;

	let isLoadingData = true;
	let error = '';

	onMount(() => {
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));
		loadWireData();

		return () => {
			window.removeEventListener('online', () => (isOnline = true));
			window.removeEventListener('offline', () => (isOnline = false));
		};
	});

	async function loadWireData() {
		try {
			const trainData = await fetch('/api/wire/trains');
			const trains: Train[] = await trainData.json();
			trainRefNumbers = trains.map((t) => t.TRAIN_REF_NR);
			consignmentNumbers = trains.flatMap((t) => t.consignments || []);
			trainRfidNumbers = trains.flatMap((t) => (t.TRAIN_RFID_NR ? [t.TRAIN_RFID_NR] : []));
		} catch (err) {
			error = 'Failed to load data from WIRE';
		} finally {
			isLoadingData = false;
		}
	}

	function handleCapture(event: CustomEvent<string>) {
		capturedImage = event.detail;
	}

	function handleCameraClose() {
		showCamera = false;
	}

	async function handleSubmit() {
		if (!selectedConsignment && manualConsignment) {
			try {
				await fetch('/api/wire/consignments', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: manualConsignment,
						componentType: 'CONSIGNMENT'
					})
				});
			} catch (err) {
				error = 'Failed to create consignment';
				return;
			}
		}

		const consignment = selectedConsignment || manualConsignment;
		const trainRfid = selectedTrainRfid || manualTrainRfid;

		goto(
			`/processes/marshaling-dispatch/wagon-linkage?trainRef=${selectedTrainRef}&consignment=${consignment}&trainRfid=${trainRfid}`
		);
	}
</script>

<div >
	<div >
		<h1>Marshaling Dispatch</h1>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

			<div class="input-group">
				<label for="trainRef">Train Reference Number</label>
				<select id="trainRef" bind:value={selectedTrainRef}>
					<option value="">Select Train Reference</option>
					{#each trainRefNumbers as refNumber}
						<option value={refNumber}>{refNumber}</option>
					{/each}
				</select>
			</div>

			<div class="input-group">
				<label for="consignment">Consignment Number</label>
				{#if consignmentNumbers.length > 0}
					<select id="consignment" bind:value={selectedConsignment}>
						<option value="">Select Consignment</option>
						{#each consignmentNumbers as consignment}
							<option value={consignment}>{consignment}</option>
						{/each}
					</select>
				{/if}
				<input
					type="text"
					placeholder="Enter Consignment Number"
					bind:value={manualConsignment}
					disabled={selectedConsignment !== ''}
				/>
			</div>

			<div class="input-group">
				<label for="trainRfid">Train RFID Number</label>
				{#if trainRfidNumbers.length > 0}
					<select id="trainRfid" bind:value={selectedTrainRfid}>
						<option value="">Select Train RFID</option>
						{#each trainRfidNumbers as rfid}
							<option value={rfid}>{rfid}</option>
						{/each}
					</select>
				{/if}
				<input
					type="text"
					placeholder="Enter Train RFID Number"
					bind:value={manualTrainRfid}
					disabled={selectedTrainRfid !== ''}
				/>
			</div>

			<Camera {showCamera} on:capture={handleCapture} on:close={handleCameraClose} />

			{#if capturedImage}
				<div class="image-preview">
					<img src={capturedImage} alt="Captured train" />
					<button class="camera-button" on:click={() => (showCamera = true)}> Retake Photo </button>
				</div>
			{:else}
				<button class="camera-button" on:click={() => (showCamera = true)}> Open Camera </button>
			{/if}

			<div class="button-group">
				<button class="submit-button" on:click={handleSubmit}> Submit </button>
			</div>
	</div>
</div>
