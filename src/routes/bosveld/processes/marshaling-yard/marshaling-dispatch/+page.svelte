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
	let foundTrainDispatch = false;
	let showPopup = false;
	let processLayout: ProcessLayout;

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
				(c) => !c.linkedTrainId && c.siteLocation === 'Bosveld'
			);
		} catch (e) {
			console.error(e);
			error = 'Failed to load data';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadTrainsAndConsignments);

	async function checkTrainDispatches() {
		const trains = (await indexedDBService.getAllRecords('trains')).find(
			(t) => t.refNr === selectedTrainRef
		);

		const trainDispatches = (await indexedDBService.getAllRecords('trainDispatches')).find(
			(d) => !d.dispatchTimestamp && d.linkedTrainId === trains?.serverId
		);
		
		if (trainDispatches) {
			// Find the consignment by id
			const consignment = (await indexedDBService.getAllRecords('consignments')).find(
				(c) => c.serverId === trainDispatches.linkedConsignmentId || c.id === trainDispatches.linkedConsignmentId
			);
			if (consignment) {
				consignments = [...consignments, consignment];
				selectedConsignment = consignment.name;
				foundTrainDispatch = true;
			}
		}
		
	}

	$: if (selectedTrainRef) {
		checkTrainDispatches();
	};

	async function confirmFinishDispatch(confirm: boolean) {
		if (confirm) {
			let train = (await indexedDBService.getAllRecords('trains')).filter(
				train => train.refNr === selectedTrainRef
			)[0];

			const trainDispatches = (await indexedDBService.getAllRecords('trainDispatches')).find(
				(d) => !d.dispatchTimestamp && d.linkedTrainId === train?.serverId
			);

			if (!trainDispatches) {
				error = 'Train dispatch not found';
				return;
			}

			await indexedDBService.updateRecord('trainDispatches', trainDispatches.id, {
				...trainDispatches,
				syncStatus: 'pending',
				dispatchTimestamp: new Date(),
				updated: new Date().toISOString()
			});
		}
		showPopup = false;

		processLayout.setSuccess('Wagon linkage completed');

		setTimeout(() => {
			location.reload();
		}, 1000);
	}

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

		const dispatchId = crypto.randomUUID();
		
		try {
			if (foundTrainDispatch) {
				const trains = (await indexedDBService.getAllRecords('trains')).find(
					(t) => t.refNr === selectedTrainRef
				);

				const trainDispatches = (await indexedDBService.getAllRecords('trainDispatches')).find(
					(d) => !d.dispatchTimestamp && d.linkedTrainId === trains?.serverId
				);
				
				goto(`/bosveld/processes/marshaling-yard/marshaling-dispatch/wagon-linkage?dispatchId=${trainDispatches?.serverId}`);
			} else {
				const linkedConsignment = consignments.find((c) => c.name === selectedConsignment);
				if (!linkedConsignment) {
					error = 'Selected consignment not found';
					return;
				}
				await indexedDBService.updateRecord('consignments', linkedConsignment.id, {
					linkedTrainId: train.serverId,
					siteLocation: 'Bosveld',
					syncStatus: 'pending',
					updated: new Date().toISOString()
				});

				const linkedTrainId = (await indexedDBService.getAllRecords('trains')).find(
					(t) => t.refNr === selectedTrainRef
				);

				if (!linkedTrainId) {
					error = 'Selected train not found';
					return;
				}

				const trainDispatch: TrainDispatch = {
					id: dispatchId,
					linkedTrainId: linkedTrainId?.serverId || linkedTrainId?.id,
					linkedConsignmentId: linkedConsignment?.serverId || linkedConsignment?.id,
					process: 'MarshalingDispatch',
					syncStatus: 'pending',
					created: new Date(),
					updated: new Date().toISOString(),
					siteLocation: 'Bosveld',
				};

				await indexedDBService.saveRecord('trainDispatches', trainDispatch);

				success = 'Dispatch initialized';
				goto(`/bosveld/processes/marshaling-yard/marshaling-dispatch/wagon-linkage?dispatchId=${dispatchId}`);
			}
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
	bind:this={processLayout}
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
{#if selectedTrainRef && foundTrainDispatch}
	<div class="flex space-x-4 button-group">
		<button
			type="button"
			class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
			on:click={() => showPopup = true}
		>
			Finalize Consignment
		</button>
	</div>
	<!-- Custom Popup -->
	{#if showPopup}
		<div class="popup-overlay">
			<div class="popup-content">
				<p class="popup-message">Are you sure you are done sampling train {selectedTrainRef}?</p>
				<div class="popup-buttons">
					<button
						type="button"
						class="popup-button confirm-button"
						on:click={() => confirmFinishDispatch(true)}
					>
						Yes
					</button>
					<button
						type="button"
						class="popup-button cancel-button"
						on:click={() => confirmFinishDispatch(false)}
					>
						No
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.flex.space-x-4.button-group {
		margin-left: 1rem;
		margin-right: 1rem;
	}

	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.popup-content {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		text-align: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.popup-message {
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	.popup-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.popup-button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	.confirm-button {
		background: #4caf50;
		color: white;
	}

	.cancel-button {
		background: #f44336;
		color: white;
	}
</style>