<script lang="ts">
	import { onMount } from 'svelte';
	import Camera from '$lib/components/Camera.svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train, Consignment } from '$lib/types';
	import type { TrainDispatch } from '$lib';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import moment from 'moment';
	import { date } from 'zod';

	let trains: Train[] = [];
	let consignments: Consignment[] = [];
	let selectedTrainRef = '';
	let selectedConsignment: string | undefined = '';
	let manualConsignment = '';
	let selectedRfid = '';
	let manualRfid = '';
	let capturedImage: string | null = null;
	let showCamera = false;
	let error = '';
	let success = '';
	let isLoading = true;

	const steps = ['Train & Consignment Details', 'Wagon Linkage', 'Complete'];
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
					manualRfid = '';
					capturedImage = null;
					showCamera = false;
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

	function handleCapture(event: CustomEvent<string>) {
		capturedImage = event.detail;
	}
	function handleCameraClose() {
		showCamera = false;
	}

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
					siteLocation: 'PMC'
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
			const consignments = await indexedDBService.getAllRecords('consignments');
			const linkedConsignment = consignments.find(c => {
				if (!c.created) return false;
				return c.name === manualConsignment &&
					Math.abs(new Date(c.created).getTime() - Date.now()) < 5000;
			});
		
			const trainDispatch: TrainDispatch = {
			id: dispatchId,
			linkedTrainId: train.serverId,
			linkedConsignmentId: linkedConsignment?.id,
			process: 'MarshalingDispatch',
			syncStatus: 'pending',
			created: new Date(),
			updated: new Date().toISOString(),
			siteLocation: 'PMC',
		};
			await indexedDBService.saveRecord('trainDispatches', trainDispatch);
			success = 'Dispatch initialized';
			goto(`/pmc/processes/magnetite-rail/marshaling-yard/marshaling-dispatch/wagon-linkage?dispatchId=${dispatchId}`);
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
	cancelPath="/pmc/processes/magnetite-rail/marshaling-yard"
	on:cancel={() => goto('/pmc/processes/magnetite-rail/marshaling-yard')}
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
		isSelect={true}
		placeholder="Select Train Reference"
		bind:value={selectedTrainRef}
		options={trains.map((t) => ({ value: t.refNr, label: t.refNr }))}
		/>
		<FormField	
			label="Consignment Number"
			id="consignmentNumber"
			isSelect={false}
			placeholder="Enter Consignment Number"
			bind:value={manualConsignment}
		/>
		<FormField
			label="Train RFID Number"
			id="trainRfid"
			isSelect={false}
			placeholder="Enter Train RFID Number"
			bind:value={manualRfid}
		/>
		{/if}
		<!-- <Camera onPhotoSelected={handleCapture} on:close={handleCameraClose} /> -->	
</ProcessLayout>
