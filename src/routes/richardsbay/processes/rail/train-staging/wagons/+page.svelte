<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import FormField from '$lib/components/FormField.svelte';
	import type { Wagon } from '$lib/types/wagon';
	import { page } from '$app/stores';

	// Form state
	let trainRefNr = $page.url.searchParams.get('trainRefNr') || '';
	let wagonIdSimple = '';
	let isSubmitting = false;
	let showSearch = false;
	let currentStep = 2;
	let availableWagons: Wagon[] = [];

	// Process steps
	const processSteps = ['Arrival Train', 'Wagon', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	let existingIdsArray: string[] = [];
	$: existingIdsArray = ($page.url.searchParams.get('wagonIds') || '').split(',').filter(Boolean);

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
			wagon => !wagon.stagingTimestamp
		);
	});

	async function handleSubmit() {
		try {
			isSubmitting = true;
			processLayout.setError('');

			// Check if wagon exists in Pocketbase DB
			const pbWagons = await indexedDBService.getAllRecords('wagons');
			const wagonToUse = pbWagons.find(wagon => wagon.wagonIdSimple === wagonIdSimple);

			if (!wagonToUse) {
				processLayout.setError('Wagon Not in Pre-Registration List');
				return;
			}

			// Update wagon
			await indexedDBService.updateRecord('wagons', wagonToUse.id, {
				...wagonToUse,
				syncStatus: 'pending',
				stagingTimestamp: new Date(),
			});

			// Add the new wagon's id to the list and pass as a query param
			const dispatchedIds = [...(existingIdsArray), wagonToUse.id];
			goto(`/richardsbay/processes/rail/train-staging/wagons/review?wagonIdSimples=${dispatchedIds.join(',')}&trainRefNr=${trainRefNr}`);
		} catch (error) {
			console.error('Failed to submit wagon arrival:', error);
			processLayout.setError('Failed to submit wagon arrival. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail/train-staging');
	}

</script>

<ProcessLayout
	title="Wagon Details"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/rail/train-staging"
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
				options={availableWagons.map(wagon => ({ value: wagon.wagonIdSimple ?? '', label: wagon.wagonIdSimple ?? '' }))}
				bind:value={wagonIdSimple}
				placeholder="Select Wagon ID"
				required
				on:focus={() => showSearch = true}
				on:blur={() => setTimeout(() => (showSearch = false), 200)}
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
