<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import FormField from '$lib/components/FormField.svelte';
	import type { Wagon } from '$lib/types/wagon';
	import { page } from '$app/stores';
	import { Portal } from '$lib/components/ui/alert-dialog';

	// Form state
	let trainRefNr = $page.url.searchParams.get('trainRefNr') || '';
	let wagonId = '';
	let isSubmitting = false;
	let showSearch = false;
	let currentStep = 2;
	let availableWagons: Wagon[] = [];
	let portSampleId = '';

	// Process steps
	const processSteps = ['Arrival Train', 'Wagon', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		let linkedTrain = (await indexedDBService.getAllRecords('trains')).find(
			train => train.refNr === trainRefNr
		);
	
		let trainArrival = (await indexedDBService.getAllRecords('trainArrivals')).find(
			train => train.trainId === linkedTrain?.id
		);

		const linkedWagons = trainArrival?.linkedWagonIds || [];

		let allwagons = (await indexedDBService.getAllRecords('wagons')).filter(
			wagon => linkedWagons.some(linkedWagon => linkedWagon === wagon.id || linkedWagon === wagon.serverId)
		);

		availableWagons = allwagons.filter(
			wagon => !wagon.sampleTimestamp
		);
	});

	async function handleSubmit() {
		try {
			isSubmitting = true;
			processLayout.setError('');

			// Check if wagon exists in Pocketbase DB
			const pbWagons = await indexedDBService.getAllRecords('wagons');
			const wagonToUse = pbWagons.find(wagon => wagon.wagonId === wagonId);

			if (!wagonToUse) {
				processLayout.setError('Wagon Not in Pre-Registration List');
				return;
			}

			// Update wagon
			await indexedDBService.updateRecord('wagons', wagonToUse.id, {
				...wagonToUse,
				syncStatus: 'pending',
				sampleTimestamp: new Date(),
				portSampleId: portSampleId
			});

			goto(`/richardsbay/processes/rail/train-sampling/wagons/review?trainRefNr=${trainRefNr}`);
		} catch (error) {
			console.error('Failed to submit wagon arrival:', error);
			processLayout.setError('Failed to submit wagon arrival. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail/train-sampling');
	}

</script>

<ProcessLayout
	title="Wagon Details"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/rail/train-sampling"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Wagon Details</h5>
		<div>
			<p class="text-gray-500">Scan/Enter the Wagon ID and Sample ID.</p>
		<div class="space-y-6">
	</div>
	

		<div class="form">
			<FormField
				id="wagonId"
				label="Wagon ID"
				search={true}
				options={availableWagons.map(wagon => ({ value: wagon.wagonId ?? '', label: wagon.wagonIdSimple ?? '' }))}
				bind:value={wagonId}
				placeholder="Select Wagon ID"
				required
				on:focus={() => showSearch = true}
				on:blur={() => setTimeout(() => (showSearch = false), 200)}
			/>
		</div>

		{#if wagonId}
			<div class="form">
				<FormField
					id="sampleId"
					label="Sample ID"
					placeholder="Enter Sample ID"
					required
					bind:value={portSampleId}
				/>
			</div>
		{/if}
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
