<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { ShuntingTrain } from '$lib';

	// Form state
	let isSubmitting = false;
	let currentStep = 1;

	let availableTrains: any[] = [];
	let selectedTrain: any = '';
	let showPopup = false;

	// Process steps
	const processSteps = ['Shunting Train', 'Wagon Sampling', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Fetch all shunting trains
		const shuntingTrains = (await indexedDBService.getAllRecords('shuntingTrains')).filter(
			shunting => shunting.finishSamplingTimestamp === '' && shunting.verificationTimestamp !== ''
		);

		availableTrains = shuntingTrains.map(shunting => ({
			value: shunting.verificationTimestamp,
			label: shunting.verificationTimestamp
		}));
	});

	async function handleSubmit() {
		if (!selectedTrain) {
			processLayout.setError('Please select a train reference number.');
			return;
		}
		let shuntingTrain = (await indexedDBService.getAllRecords('shuntingTrains')).find(
			train => train.verificationTimestamp === selectedTrain
		);

		if (!shuntingTrain) {
			processLayout.setError(`No shunting train found.`);
			return;
		}

		let linkedWagonIds = shuntingTrain.linkedWagons || [];

		for (let wagonId of linkedWagonIds) {
			let wagon = (await indexedDBService.getAllRecords('wagons')).find(
				wagon => wagon.serverId === wagonId
			);

			if (wagon?.sampleTimestamp !== '') {
				goto(`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons/review?shuntingTrainVerificationDate=${selectedTrain}`);
				return;
			}
		}
		goto(`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons?shuntingTrainVerificationDate=${selectedTrain}`);
	}

	async function confirmFinishSampling(confirm: boolean) {
		if (confirm) {
			let shuntingTrains = (await indexedDBService.getAllRecords('shuntingTrains')).find(
				train => train.verificationTimestamp === selectedTrain
			);

			if (!shuntingTrains) {
				processLayout.setError(`No shunting train found.`);
				return;
			}

			await indexedDBService.updateRecord('shuntingTrains', shuntingTrains.id, {
				finishSamplingTimestamp: new Date(),
				syncStatus: 'pending'
			});

			processLayout.setSuccess(`Train sampling finished successfully.`);
			setTimeout(() => {
				location.reload();
			}, 1000);
		}
		showPopup = false;
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-rail/east-load-out');
	}
</script>

<ProcessLayout
	title="Train Shunting"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/pmc/processes/magnetite-rail/east-load-out"
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
				isSelect={true}
				options={availableTrains}
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
