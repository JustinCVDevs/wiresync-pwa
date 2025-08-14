<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train, Consignment } from '$lib/types';
	import type { TrainDispatch } from '$lib';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';

	let trains: Train[] = [];
	let consignments: Consignment[] = [];
	let selectedTrainRef = '';
	let selectedConsignment = '';
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
					error = '';
					if (train) {
						consignments = await indexedDBService.getRecords(
							'consignments',
							(rec) => rec.syncStatus === 'synced' && rec.linkedTrainId === train.serverId
						);
					}
				}
			}

			const consignmentRecords = await indexedDBService.getRecords(
				'consignments',
				(rec) => rec.syncStatus === 'synced'
			);
			consignments = consignmentRecords.filter(
				(c) => !c.linkedTrainId && c.siteLocation === 'PMC'
			);
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
		if (!selectedConsignment) {
			error = 'Please select a consignment number';
			return;
		}
		if (!train?.serverId) return;

		const dispatchId = crypto.randomUUID();
		
		try {
			const linkedConsignment = consignments.find((c) => c.name === selectedConsignment);
			if (!linkedConsignment) {
				error = 'Selected consignment not found';
				return;
			}
			await indexedDBService.updateRecord('consignments', linkedConsignment.id, {
				linkedTrainId: train.serverId,
				siteLocation: 'PMC',
				syncStatus: 'pending',
				updated: new Date().toISOString()
			});

			const trainDispatch: TrainDispatch = {
				id: dispatchId,
				linkedTrainId: train.serverId,
				linkedConsignmentId: linkedConsignment?.serverId || linkedConsignment?.id,
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
			isSelect={true}
			placeholder="Select Consignment Number"
			bind:value={selectedConsignment}
			options={consignments.map((c) => ({ value: c.name, label: c.name }))}
		/>
		{/if}
</ProcessLayout>
