<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types/wagon';

	// Form state
	let wagonID = '';
	let isSubmitting = false;
	let currentStep = 1;
	let arrivalTimestamp = formatTimestamp(new Date());
	let sampleID = '';

	let availableWagons: Wagon[] = [];
	let filteredWagonSuggestions: Wagon[] = [];
	let showWagonSuggestions = false;
	let showWagonNotFound = false;
	let selectedWagon: Wagon | null = null;

	// Process steps
	const processSteps = ['Wagon', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		availableWagons = (await indexedDBService.getAllRecords('wagons')).filter(
			wagon => !wagon.dispatchTimestamp
		);
		console.log('Avaible wagon count', availableWagons.length);
	});

	function handleWagonInput() {
		const value = wagonID.trim();
		selectedWagon = null;
		showWagonNotFound = false;

		if (value.length === 0) {
			showWagonSuggestions = false;
			filteredWagonSuggestions = [];
			return;
		}

		filteredWagonSuggestions = availableWagons.filter(wagon =>
			wagon.transcoreTag?.toLowerCase().includes(value.toLowerCase())
		).slice(0, 6);

		const exactMatch = availableWagons.find(wagon =>
			wagon.transcoreTag?.toLowerCase() === value.toLowerCase()
		);

		if (exactMatch) {
			selectedWagon = exactMatch;
			wagonID = exactMatch.transcoreTag ?? '';
			showWagonSuggestions = false;
		} else if (value.length >= 2) {
			showWagonSuggestions = filteredWagonSuggestions.length > 0;
			if (value.length >= 3 && filteredWagonSuggestions.length === 0) {
				showWagonNotFound = true;
			}
		}
	}

	function showAllTruckSuggestions() {
		if (availableWagons.length > 0) {
			filteredWagonSuggestions = availableWagons.slice(0, 6);
			showWagonSuggestions = true;
		}
	}

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	async function handleSubmit() {
		try {
			isSubmitting = true;
			processLayout.setError('');

			// Check if truck exists in Pocketbase DB
			const pbWagons = await indexedDBService.getAllRecords('wagons');
			const wagonToUse = pbWagons.find(wagon => wagon.transcoreTag === wagonID);

			if (!wagonToUse) {
				processLayout.setError('Truck Not in Pre-Registration List');
				isSubmitting = false;
				return;
			}

			// Update truck
			await indexedDBService.updateRecord('wagons', wagonToUse.serverId ?? wagonToUse.id ?? '', {
				...wagonToUse,
				syncStatus: 'pending',
				dispatchTimestamp: new Date(),
			});

			processLayout.setSuccess('Truck Successfully Received!');

			setTimeout(() => {
				goto('/richardsbay/processes/rail');
			}, 2000);
		} catch (error) {
			console.error('Failed to submit truck arrival:', error);
			processLayout.setError('Failed to submit truck arrival. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes/rail');
	}

</script>

<ProcessLayout
	title="Wagon Details"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/rail"
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
			<label for="truckRegistration" class="block font-medium text-gray text-sm">Truck Registration *</label>
			<input
				id="truckRegistration"
				type="text"
				bind:value={wagonID}
				placeholder="Enter Truck Registration"
				on:input={handleWagonInput}
				on:focus={showAllTruckSuggestions}
				on:blur={() => setTimeout(() => showWagonSuggestions = false, 100)}
				required
				class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
			/>
			{#if showWagonSuggestions}
				<ul class="suggestions-list">
					{#each filteredWagonSuggestions as suggestion, i}
						<li>
							<button
								type="button"
								on:click={() => {
									wagonID = suggestion.transcoreTag ?? '';
									showWagonSuggestions = false;
									selectedWagon = suggestion;
									sampleID = suggestion.wagonIdSimple ?? '';
								}}
							>
								{suggestion.transcoreTag}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if selectedWagon}
				<div style="margin-top: 1.2rem;">
					<FormField
						id="arrivalTimestamp"
						label="Arrival Timestamp:"
						bind:value={arrivalTimestamp}
						placeholder="Enter vehicle registration"
						disabled={true}
					/>
				</div>

				<div style="margin-top: 1.2rem;">
					<FormField
						id="sampleID"
						label="Sample ID:"
						bind:value={sampleID}
						placeholder="Enter wagon sample ID"
						disabled={true}
					/>
				</div>
			{/if}
		</div>
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
	.form #truckRegistration {
		min-height: 40px;
	}

	.suggestions-list {
		border: 1px solid #ccc;
		background: #fff;
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 150px;
		overflow-y: auto;
		position: absolute;
		z-index: 10;
		width: 100%;
	}

	.suggestions-list li:nth-child(even) {
		background: #f6f8fa;
	}
	.suggestions-list li:nth-child(odd) {
		background: #fff;
	}

	.suggestions-list button {
		width: 100%;
		text-align: left;
		padding: 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		color: #222;
		transition: background 0.2s;
	}

	.suggestions-list button:hover {
		background: #2563eb;
		color: #fff;
	}

	.suggestions-list li {
		padding: 0;
		margin: 0;
	}
</style>
