<script lang="ts">
	import { onMount } from 'svelte';
	import Camera from '$lib/components/Camera.svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train, Consignment } from '$lib/types';
	import type { TrainDispatch } from '$lib';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';

	let trains: Train[] = [];
	let consignments: Consignment[] = [];
	let selectedTrainRef = '';
	let selectedConsignment: string | undefined = '';
	let manualConsignment = '';
	let selectedRfid = '';
	let manualRfid = '';
	let capturedImage: string | null = null;
	let showCamera = true;
	let error = '';
	let success = '';
	let isLoading = true;

	const steps = ['Train & Consignment Details', 'Wagon Linkage'];
	let currentStep = 1;
	let train: Train;

	async function loadTrainsAndConsignments() {
		try {
			const trainRecords = await indexedDBService.getRecords(
				'trains',
				(rec) => rec.syncStatus === 'synced'
			);
			trains = trainRecords;

			if (selectedTrainRef) {
				const foundTrain = trains.find((t) => t.refNr === selectedTrainRef);
				if (foundTrain) {
					train = foundTrain;
					manualConsignment = '';
					selectedConsignment = '';
					selectedRfid = '';
					manualRfid = '';
					capturedImage = null;
					showCamera = true;
					error = '';
					if (train) {
						consignments = await indexedDBService.getRecords(
							'consignments',
							(rec) => rec.syncStatus === 'synced' && rec.linkedTrainId === train.serverId
						);
					}
				}
			}
		} catch (e) {
			console.error(e);
			error = 'Failed to load data';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadTrainsAndConsignments);
	$: if (selectedTrainRef) loadTrainsAndConsignments();

	async function handleSubmit() {
		error = '';
		if (!selectedTrainRef) {
			error = 'Please select a train reference number';
			return;
		}
		if (!selectedConsignment && !manualConsignment) {
			error = 'Please select or enter a consignment number';
			return;
		}
		if (!train?.serverId) return;

		const dispatchId = crypto.randomUUID();
		
		function genId(len = 15) {
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			const bytes = crypto.getRandomValues(new Uint8Array(len));
			return Array.from(bytes, (b) => chars[b % chars.length]).join('');
		}
		try {
			if (manualConsignment) {
				await indexedDBService.saveRecord('consignments', {
					id: genId(),
					name: manualConsignment,
					linkedTrainId: train.serverId,
					syncStatus: 'pending',
					created: new Date(),
					updated: new Date().toISOString(),
					siteLocation: 'Bosveld'
				});
			}
			if (manualRfid) {
				await indexedDBService.updateRecord('trains', train.serverId, {
					...train,
					rfidNr: manualRfid,
					syncStatus: 'pending',
					updated: new Date().toISOString()
				});
			}
			const newConsignments = (await indexedDBService.getAllRecords('consignments')).find(
				(c) => c.name === manualConsignment
			);

			const trainDispatch: TrainDispatch = {
			id: dispatchId,
			linkedTrainId: train.serverId,
			linkedConsignmentId: newConsignments?.serverId,
			process: 'MarshalingDispatch',
			syncStatus: 'pending',
			created: new Date(),
			updated: new Date().toISOString(),
			siteLocation: 'Bosveld'
		};
			await indexedDBService.saveRecord('trainDispatches', trainDispatch);
			success = 'Dispatch initialized';
			goto(`/bosveld/processes/marshaling-yard/marshaling-dispatch/wagon-linkage?dispatchId=${dispatchId}`);
		} catch (e: any) {
			console.error(e);
			error = 'Failed to initialize dispatch' + e?.data?.toJson();
		}
	}
</script>

<ProcessLayout
	title="Marshaling Dispatch"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/bosveld/processes/marshaling-yard"
	on:cancel={() => goto('/bosveld/processes/marshaling-yard')}
	on:submit={handleSubmit}
	on:error={({ detail }) => (error = detail)}
	on:success={({ detail }) => (success = detail)}
>
<div slot="header">
	<h5 class="text-xl font-bold text-gray ">Train & Consignment Linkage</h5>
	<p class="text-sm text-gay">
		Please select the train and consignment
	</p>
</div>


	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div>Loading…</div>
	{:else}

	<FormField
		label="Train Reference"
		id="trainRef"
		placeholder="Select Train Reference"
		isSelect={true}
		bind:value={selectedTrainRef}
		options={trains.map((t) => ({ value: t.refNr, label: t.refNr }))}
		/>
	
		<FormField	
			label="Manual Consignment Number"
			id="manualConsignmentNumber"
			placeholder="Enter Consignment Number"
			bind:value={manualConsignment}
		/>

		<FormField
			label="Manual Train RFID Number"
			id="manualTrainRfid"
			placeholder="Enter Train RFID Number"
			bind:value={manualRfid}
		/>
		<!-- 
		{#if showCamera}
			<Camera onPhotoSelected={handleCapture} on:close={handleCameraClose} />
		{/if}
		{#if capturedImage}
			<img src={capturedImage} alt="Captured photo" class="mt-4 rounded shadow max-w-xs" />
		{/if} -->
	{/if}
</ProcessLayout>
