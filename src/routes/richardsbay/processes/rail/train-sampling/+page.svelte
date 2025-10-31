<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Train } from '$lib/types/train';

	// Form state
	let isSubmitting = false;
	let currentStep = 1;

	let availableTrains: Train[] = [];
	let selectedTrain: any = '';
	let showPopup = false;

	// Process steps
	const processSteps = ['Arrival Train', 'Wagon Sampling', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	onMount(async () => {
		// Fetch all train arrivals
		const trainArrivals = (await indexedDBService.getAllRecords('trainArrivals')).filter(
			arrival => arrival.portRailArrivalTimestamp && arrival.portStagingTimestamp && !arrival.finishSamplingTimestamp
		);

		let linkedTrains = trainArrivals.map(arrival => arrival.trainId);

		// Fetch all trains
		const allTrains = (await indexedDBService.getAllRecords('trains')).filter(train =>
			linkedTrains.includes(train.serverId)
		);

		// Filter trains that match the train arrivals' port_arrival_sample_id
		availableTrains = allTrains.filter(train =>
			trainArrivals.some(arrival => arrival.trainId === train.serverId)
		);
	});

	async function handleSubmit() {
		isSubmitting = true;
		try {
			if (!selectedTrain) {
				processLayout.setError('Please select a train reference number.');
				return;
			}
			let train = (await indexedDBService.getAllRecords('trains')).find(
				train => train.refNr === selectedTrain
			);

			let trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).find(
				arrival => arrival.trainId === train?.serverId
			);

			let linkedWagonIds = trainArrival?.linkedWagonIds || [];
			const wagons = await indexedDBService.getAllRecords('wagons');
			const hasSampledWagon = linkedWagonIds.some(wid => {
				const wagon = wagons.find(w => w.id === wid || w.serverId === wid);
				return wagon && wagon.sampleTimestamp;
			});

			if (hasSampledWagon) {
				goto(`/richardsbay/processes/rail/train-sampling/wagons/review?trainRefNr=${selectedTrain}`);
			} else {
				goto(`/richardsbay/processes/rail/train-sampling/wagons?trainRefNr=${selectedTrain}`);
			}
		} finally {
			isSubmitting = false;
		}
	}

	async function confirmFinishSampling(confirm: boolean) {
		if (confirm) {
			let train = (await indexedDBService.getAllRecords('trains')).filter(
				train => train.refNr === selectedTrain
			)[0];

			let trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).filter(
				arrival => arrival.trainId === train.serverId
			)[0];

			await indexedDBService.updateRecord('trainArrivals', trainArrival.id, {
				finishSamplingTimestamp: new Date(),
				syncStatus: 'pending'
			});

			processLayout.setSuccess(`Train sampling finished successfully for train ${selectedTrain}.`);
			setTimeout(() => {
				location.reload();
			}, 1000);
		}
		showPopup = false;
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail');
	}
</script>

<ProcessLayout
	title="Train Sampling"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/rail"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Sampling Arrived Trains</h5>
	</div>

	<div class="space-y-6">
		<div class="form">
			<FormField
				id="trainArrival"
				label="Train Reference Number"
				search={true}
				options={availableTrains.map(train => ({ value: train.refNr, label: train.refNr }))}
				bind:value={selectedTrain}
				placeholder="Select Train Reference Number"
				required
			/>
		</div>
	</div>
</ProcessLayout>
{#if selectedTrain}
	<div class="flex space-x-4 button-group">
		<button
			type="button"
			class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
			on:click={() => showPopup = true}
		>
			Finish Train Sampling
		</button>
	</div>
{/if}
<!-- Custom Popup -->
{#if showPopup}
	<div class="popup-overlay">
		<div class="popup-content">
			<p class="popup-message">Are you sure you are done sampling train {selectedTrain}?</p>
			<div class="popup-buttons">
				<button
					type="button"
					class="popup-button confirm-button"
					on:click={() => confirmFinishSampling(true)}
				>
					Yes
				</button>
				<button
					type="button"
					class="popup-button cancel-button"
					on:click={() => confirmFinishSampling(false)}
				>
					No
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}

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
