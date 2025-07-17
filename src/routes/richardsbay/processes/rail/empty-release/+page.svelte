<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { Wagon } from '$lib/types/wagon';
	import { Container, Search, CheckCircle, AlertCircle, Package } from 'lucide-svelte';

	let wagonInput = '';
	let selectedWagon: Wagon | null = null;
	let availableWagons: Wagon[] = [];
	let filteredSuggestions: Wagon[] = [];
	let showSuggestions = false;
	let showNotFound = false;
	let error = '';
	let success = '';
	let isSubmitting = false;
	let isLoading = true;
	let inputElement: HTMLInputElement;
	let highlightedIndex = -1;

	const steps = [
		'Select Wagon',
		'Review & Release'
	];
	let currentStep = 1;

	async function loadAvailableWagons() {
		isLoading = true;
		try {
			const allWagons = await indexedDBService.getAllRecords('wagons');
			// Filter wagons that don't have verification dates set
			availableWagons = allWagons.filter(wagon => 
				!wagon.releaseTimestamp && wagon.dispatchTimestamp
			);
		} catch (e) {
			console.error('Error loading wagons:', e);
			error = 'Failed to load available wagons';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadAvailableWagons();
	});

	// Handle input changes and filter suggestions
	function handleInput() {
		const value = wagonInput.trim();
		selectedWagon = null;
		showNotFound = false;
		error = '';
		highlightedIndex = -1;

		// Always filter suggestions, even for the first character
		filteredSuggestions = availableWagons.filter(wagon => 
			wagon.wagonIdSimple?.toLowerCase().includes(value.toLowerCase()) ||
			wagon.transcoreTag?.toLowerCase().includes(value.toLowerCase())
		).slice(0, 6); // Limit to 6 suggestions

		// Check for exact match
		const exactMatch = availableWagons.find(wagon => 
			wagon.wagonIdSimple?.toLowerCase() === value.toLowerCase() ||
			wagon.transcoreTag?.toLowerCase() === value.toLowerCase()
		);

		if (exactMatch) {
			selectedWagon = exactMatch;
			showSuggestions = false;
		} else {
			showSuggestions = filteredSuggestions.length > 0;
			if (value.length >= 3 && filteredSuggestions.length === 0) {
				showNotFound = true;
			}
		}
	}

	// Handle suggestion selection
	function selectSuggestion(wagon: Wagon) {
		selectedWagon = wagon;
		wagonInput = wagon.wagonIdSimple || wagon.transcoreTag || '';
		showSuggestions = false;
		showNotFound = false;
		error = '';
		highlightedIndex = -1;
		inputElement.focus();
	}

	// Handle input blur with delay to allow suggestion clicks
	function handleBlur() {
		setTimeout(() => {
			showSuggestions = false;
			highlightedIndex = -1;
		}, 200);
	}

	// Handle input focus
	function handleFocus() {
		if (wagonInput.length >= 2 && filteredSuggestions.length > 0) {
			showSuggestions = true;
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
			// Update wagon with verification date
			await indexedDBService.updateRecord('wagons', selectedWagon.id, {
				...selectedWagon,
				process: 'Wagon_Release',
				componentType: 'WAGON_Release',
				dispatchTimestamp: undefined,
				releaseTimestamp: new Date(),
				updated: new Date().toISOString()
			});

			success = 'Wagon selected successfully';
			// Navigate to review page with wagon ID
			setTimeout(() => {
				goto(`/richardsbay/processes/rail/empty-release/review?wagonId=${selectedWagon?.id}`);
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
	showSubmit={false}
	showCancel={false}
>
	{#if isLoading}
		<div class="flex justify-center items-center py-12">
			<div class="flex items-center gap-3 text-gray-600">
				<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
				<span>Loading available wagons...</span>
			</div>
		</div>
	{:else}
		<div class="space-y-8">
			<!-- Wagon Search Input -->
			<div class="space-y-6">
				<div class="flex items-center gap-3 text-gray-800">
					
					<h2 class="text-xl font-semibold">Find Empty Wagon for Release</h2>
				</div>

				<div class="relative">
					<label for="wagonSearch" class="block text-sm font-medium text-gray-700 mb-3">
						Wagon ID *
					</label>
					
					<div class="relative">
						<Search class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={20} />
						<input
							bind:this={inputElement}
							id="wagonSearch"
							type="text"
							bind:value={wagonInput}
							on:input={handleInput}
							on:focus={handleFocus}
							on:blur={handleBlur}
							placeholder="Start typing wagon ID..."
							class="w-full pl-12 pr-12 py-4 rounded-xl border-2 text-base font-medium transition-all duration-300 shadow-sm {
								selectedWagon 
									? 'border-green-400 bg-green-50 focus:border-green-500 focus:ring-4 focus:ring-green-100 text-green-800' 
									: showNotFound 
										? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100 text-red-800'
										: 'border-gray-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 hover:border-gray-400'
							} focus:outline-none"
							autocomplete="off"
						/>
						
						<!-- Status Icon -->
						{#if selectedWagon}
							<div class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-green-500 rounded-full p-1">
								<CheckCircle class="text-white" size={16} />
							</div>
						{:else if showNotFound}
							<div class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-red-500 rounded-full p-1">
								<AlertCircle class="text-white" size={16} />
							</div>
						{/if}
					</div>

					<!-- Enhanced Suggestions Dropdown -->
					{#if showSuggestions && filteredSuggestions.length > 0}
						<div class="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
							<div class="max-h-80 overflow-y-auto">
								{#each filteredSuggestions as suggestion, index}
									<button
										type="button"
										on:click={() => selectSuggestion(suggestion)}
										class="w-full px-5 py-4 text-left transition-all duration-150 border-b border-gray-100 last:border-b-0 text-white {
											index === highlightedIndex 
												? 'bg-blue-700 border-blue-400' 
												: 'bg-gray-900 hover:bg-gray-800 focus:bg-blue-700'
										} focus:outline-none group"
									>
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-3">
												<div class="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors duration-150">
													<Package size={16} class="text-gray-600 group-hover:text-blue-600" />
												</div>
												<div>
													<div class="font-semibold text-white text-base">
														{suggestion.wagonIdSimple || 'No Wagon ID'}
													</div>
													{#if suggestion.transcoreTag && suggestion.transcoreTag !== suggestion.wagonIdSimple}
														<div class="text-sm text-white mt-1">
															Transcore: <span class="font-medium">{suggestion.transcoreTag}</span>
														</div>
													{/if}
												</div>
											</div>
											<div class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
												{new Date(suggestion.created!).toLocaleDateString()}
											</div>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Selected Wagon Display -->
				{#if selectedWagon}
					<div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
						<div class="flex items-center gap-3 text-green-700 mb-4">
							<div class="p-2 bg-green-200 rounded-lg">
								<CheckCircle size={20} class="text-green-700" />
							</div>
							<span class="font-semibold text-lg">Wagon Selected</span>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="space-y-2">
								<span class="text-sm font-medium text-gray-600">Wagon ID</span>
								<p class="text-lg font-bold text-gray-900">{selectedWagon.wagonIdSimple}</p>
							</div>
							{#if selectedWagon.transcoreTag}
								<div class="space-y-2">
									<span class="text-sm font-medium text-gray-600">Transcore Tag</span>
									<p class="text-lg font-bold text-gray-900">{selectedWagon.transcoreTag}</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Not Found Message -->
				{#if showNotFound}
					<div class="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 shadow-sm">
						<div class="flex items-center gap-3 text-amber-700 mb-3">
							<div class="p-2 bg-amber-200 rounded-lg">
								<AlertCircle size={20} class="text-amber-700" />
							</div>
							<span class="font-semibold text-lg">Wagon not found</span>
						</div>
						<p class="text-amber-700 leading-relaxed">
							No wagon found with ID <span class="font-semibold">"{ wagonInput}"</span>. 
							Please check the ID or ensure the wagon exists without a verification date.
						</p>
					</div>
				{/if}
			</div>

			<!-- Error/Success Messages -->
			{#if error}
				<div class="rounded-xl bg-red-100 border border-red-200 p-5 text-red-700 shadow-sm" role="alert">
					<div class="flex items-center gap-2">
						<AlertCircle size={18} />
						<span class="font-medium">{error}</span>
					</div>
				</div>
			{/if}

			{#if success}
				<div class="rounded-xl bg-green-100 border border-green-200 p-5 text-green-700 shadow-sm" role="alert">
					<div class="flex items-center gap-2">
						<CheckCircle size={18} />
						<span class="font-medium">{success}</span>
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex justify-between items-center pt-8">
				<button
					type="button"
					on:click={handleCancel}
					class="px-8 py-3 text-sm font-medium rounded-xl bg-gray-100 text-gray-700 transition-all duration-200 hover:bg-gray-200 active:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={handleSubmit}
					disabled={isSubmitting || !selectedWagon}
					class="px-8 py-3 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 {
						selectedWagon && !isSubmitting
							? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus:ring-green-200'
							: 'bg-gray-300 text-gray-500 cursor-not-allowed'
					}"
				>
					{#if isSubmitting}
						<div class="flex items-center gap-2">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
							Processing...
						</div>
					{:else}
						Select Wagon
					{/if}
				</button>
			</div>
		</div>
	{/if}
</ProcessLayout>