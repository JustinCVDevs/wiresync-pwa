<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { Wagon } from '$lib/types/wagon';
	import { Container, Search, CheckCircle, AlertCircle, Package } from 'lucide-svelte';
	import FormField from '$lib/components/FormField.svelte';


	let selectedWagon: any = '';
	let availableWagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isSubmitting = false;
	let showDropdown = false;

	const steps = [
		'Select Wagon',
		'Review & Release'
	];
	let currentStep = 1;

	async function loadAvailableWagons() {
		try {
			const allWagons = await indexedDBService.getAllRecords('wagons');
			// Filter wagons that don't have verification dates set
			availableWagons = allWagons.filter(wagon => 
				!wagon.releaseTimestamp && wagon.dispatchTimestamp
			);
		} catch (e) {
			console.error('Error loading wagons:', e);
			error = 'Failed to load available wagons';
		}
	}

	onMount(() => {
		loadAvailableWagons();
		console.log('Available Wagons:', availableWagons);
	});

	$: if (showDropdown) {
		const searchInput = document.querySelector('#truckRegistartion-search') as HTMLInputElement;
		console.log('Search input:', searchInput);
		if (searchInput) {
			searchInput.focus(); 
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail');
	}

	async function handleSubmit() {
		if (!selectedWagon) {
			error = 'Please select a valid wagon';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			console.log('Selected Wagon:', selectedWagon);
			const wagon = (await indexedDBService.getAllRecords('wagons')).filter(
				(w) => w.wagonId === selectedWagon
			)[0];

			// Update wagon with verification date
			await indexedDBService.updateRecord('wagons', wagon.id, {
				...wagon,
				dispatchTimestamp: undefined,
				releaseTimestamp: new Date(),
				updated: new Date().toISOString()
			});

			success = 'Wagon selected successfully';
			// Navigate to review page with wagon ID
			setTimeout(() => {
				goto(`/richardsbay/processes/rail/empty-release/review?wagonId=${selectedWagon}`);
			}, 1000);

		} catch (e) {
			console.error('Error processing wagon:', e);
			error = 'Failed to process wagon. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<ProcessLayout
	title="Empty Wagon Release"
	steps={steps}
	currentStep={currentStep}
	cancelPath="/richardsbay/processes/rail"
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	
	<div class='form-field'>
		<FormField
			id="wagonId"
			label="Select the Wagon ID"
			search={true}
			options={availableWagons.map((wagon) => ({ value: wagon.wagonId ?? '', label: wagon.wagonId ?? '' }))} 
			bind:value={selectedWagon}
			placeholder="Select Wagon ID"
			required
		/>
	</div>
</ProcessLayout>

<style>
	.form-field {
		margin-top: 1rem;
		position: relative;
	}
</style>