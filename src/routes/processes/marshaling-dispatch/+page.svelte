<script lang="ts">
	import { onMount } from 'svelte';
	import Camera from '$lib/components/Camera.svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train, Consignment } from '$lib/types';
	import type { TrainDispatch } from '$lib';

	let trains: Train[] = [];
	let consignments: Consignment[] = [];

	let selectedTrainRef = '';
	let selectedConsignment = '';
	let manualConsignment = '';
	let selectedRfid = '';
	let manualRfid = '';
	let capturedImage: string | null = null;
	let showCamera = false;
	let error = '';
	let isLoading = true;

	async function loadTrainsAndConsignments() {
		try {
			const trainRecords = await indexedDBService.getRecords(
				'trains',
				(record) => record.syncStatus === 'synced'
			);

			trains = trainRecords;

			if (selectedTrainRef) {
				const selectedTrain = trains.find((t) => t.refNr === selectedTrainRef);
				if (selectedTrain) {
					const consignmentRecords = await indexedDBService.getRecords(
						'consignments',
						(record) =>
							record.syncStatus === 'synced' && record.linkedTrainId === selectedTrain.serverId
					);

					consignments = consignmentRecords;
				}
			}
		} catch (err) {
			error = 'Failed to load data';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	function handleCapture(event: CustomEvent<string>) {
		capturedImage = event.detail;
	}

	function handleCameraClose() {
		showCamera = false;
	}

	async function handleSubmit() {
		if (!selectedTrainRef) {
			error = 'Please select a train reference number';
			return;
		}

		if (!selectedConsignment && !manualConsignment) {
			error = 'Please select or enter a consignment number';
			return;
		}

		const selectedTrain = trains.find((t) => t.refNr === selectedTrainRef);
		if (!selectedTrain || !selectedTrain.serverId) return;

		// Create train dispatch record
		const trainDispatchRecord: TrainDispatch = {
			id: crypto.randomUUID(),
			linkedTrainId: selectedTrain.serverId,
			linkedConsignmentId: selectedConsignment || undefined,
			process: 'MarshalingDispatch',
			syncStatus: 'pending',
			created: new Date().toISOString(),
			updated: new Date().toISOString()
		};

		// Save train dispatch record
		try {
			await indexedDBService.saveRecord('trainDispatches', trainDispatchRecord);
		} catch (err) {
			error = 'Failed to create train dispatch';
			return;
		}

		// If manual consignment, create new record
		if (manualConsignment) {
			try {
				await indexedDBService.saveRecord('consignments', {
					name: manualConsignment,
					linkedTrainId: selectedTrain.serverId,
					syncStatus: 'pending',
					created: new Date().toISOString(),
					updated: new Date().toISOString()
				});
			} catch (err) {
				error = 'Failed to save consignment';
				return;
			}
		}

		// If manual RFID, update train record
		if (manualRfid && selectedTrain) {
			try {
				await indexedDBService.updateRecord('trains', selectedTrain.serverId, {
					...selectedTrain,
					rfidNr: manualRfid,
					syncStatus: 'pending',
					updated: new Date().toISOString()
				});
			} catch (err) {
				error = 'Failed to update train RFID';
				return;
			}
		}

		const consignment = selectedConsignment || manualConsignment;
		const rfid = selectedRfid || manualRfid;

		const dispatchId = trainDispatchRecord.id;
		goto(`/processes/marshaling-dispatch/wagon-linkage?dispatchId=${dispatchId}`);
	}

	onMount(() => {
		loadTrainsAndConsignments();
	});

	// Reload consignments when train selection changes
	$: if (selectedTrainRef) {
		loadTrainsAndConsignments();
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg">
	<h1 class="mb-6 text-center text-2xl font-bold">Marshaling Dispatch</h1>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else}
		<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
			<div class="space-y-2">
				<label for="trainRef" class="block text-sm font-medium text-gray-700">
					Train Reference Number
				</label>
				<select
					id="trainRef"
					class="w-full rounded-md border border-gray-300 p-2 shadow-sm"
					bind:value={selectedTrainRef}
				>
					<option value="">Select Train Reference</option>
					{#each trains as train}
						<option value={train.refNr}>{train.refNr}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<label class="block text-sm font-medium text-gray-700"> Consignment Number </label>
				{#if consignments.length > 0}
					<select
						class="mb-2 w-full rounded-md border border-gray-300 p-2 shadow-sm"
						bind:value={selectedConsignment}
						disabled={manualConsignment !== ''}
					>
						<option value="">Select Consignment</option>
						{#each consignments as consignment}
							<option value={consignment.name}>
								{consignment.name}
							</option>
						{/each}
					</select>
				{/if}
				<input
					type="text"
					placeholder="Enter Consignment Number"
					class="w-full rounded-md border border-gray-300 p-2 shadow-sm"
					bind:value={manualConsignment}
					disabled={selectedConsignment !== ''}
				/>
			</div>

			<div class="space-y-2">
				<label class="block text-sm font-medium text-gray-700"> Train RFID Number </label>
				{#if selectedTrainRef && trains.find((t) => t.refNr === selectedTrainRef)?.rfidNr}
					<select
						class="mb-2 w-full rounded-md border border-gray-300 p-2 shadow-sm"
						bind:value={selectedRfid}
						disabled={manualRfid !== ''}
					>
						<option value="">Select RFID</option>
						<option value={trains.find((t) => t.refNr === selectedTrainRef)?.rfidNr}>
							{trains.find((t) => t.refNr === selectedTrainRef)?.rfidNr}
						</option>
					</select>
				{/if}
				<input
					type="text"
					placeholder="Enter Train RFID Number"
					class="w-full rounded-md border border-gray-300 p-2 shadow-sm"
					bind:value={manualRfid}
					disabled={selectedRfid !== ''}
				/>
			</div>

			<div class="space-y-4">
				<Camera {showCamera} on:capture={handleCapture} on:close={handleCameraClose} />

				{#if capturedImage}
					<div class="overflow-hidden rounded-lg border">
						<img src={capturedImage} alt="Captured RFID" class="h-48 w-full object-cover" />
						<button
							type="button"
							class="w-full bg-gray-800 py-2 text-white"
							on:click={() => (showCamera = true)}
						>
							Retake Photo
						</button>
					</div>
				{:else}
					<button
						type="button"
						class="w-full rounded bg-gray-800 py-2 text-white"
						on:click={() => (showCamera = true)}
					>
						Open Camera
					</button>
				{/if}
			</div>

			<button type="submit" class="w-full rounded-md bg-blue-600 py-3 text-white hover:bg-blue-700">
				Continue
			</button>
		</form>
	{/if}
</div>
