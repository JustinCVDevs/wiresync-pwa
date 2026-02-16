<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';

	// Form state
	let isSubmitting = false;
	let currentStep = 1;

	let availableTrains: any[] = [];
	let selectedTrain: any = '';

	// Process steps
	const processSteps = ['Shunting Train', 'Wagon FEL Operations', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function formatDate(date: Date | undefined): string {
		if (!date) return 'No date';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(async () => {
		// Fetch all shunting trains
		const shuntingTrains = (await indexedDBService.getAllRecords('shuntingTrains')).filter(
			shunting => !shunting.finishFELOperationTimestamp && shunting.verificationTimestamp && shunting.siteLocation === 'Bosveld'
		).sort((a, b) => {
			const dateA = a.postDate ? new Date(a.postDate).getTime() : 0;
			const dateB = b.postDate ? new Date(b.postDate).getTime() : 0;
			return dateB - dateA;
		});

		availableTrains = shuntingTrains.map(shunting => ({
			value: shunting.postDate,
			label: formatDate(shunting.postDate)
		}));
	});

	async function handleSubmit() {
		isSubmitting = true;
		try {
			if (!selectedTrain) {
				processLayout.setError('Please select a train reference number.');
				return;
			}
			let shuntingTrain = (await indexedDBService.getAllRecords('shuntingTrains')).find(
				train => train.postDate === selectedTrain
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

				if (wagon?.felTimestamp) {
					goto(`/bosveld/processes/loading-station/fel-operations/wagons/review?shuntingTrainVerificationDate=${shuntingTrain.verificationTimestamp}&wagonIdSimple=${wagon.wagonIdSimple}`);
					return;
				}
			}
			goto(`/bosveld/processes/loading-station/fel-operations/wagons?shuntingTrainVerificationDate=${shuntingTrain.verificationTimestamp}`);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/bosveld/processes/loading-station');
	}
</script>

<ProcessLayout
	title="Train FEL Operations"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/bosveld/processes/loading-station"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">FEL capturing</h5>
	</div>

	<div class="space-y-6">
		<div class="form">
			<FormField
				id="trainArrival"
				label="Shunting Train Date"
				isSelect={true}
				options={availableTrains}
				bind:value={selectedTrain}
				placeholder="Select Shunting Train Date"
				required
			/>
		</div>
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
