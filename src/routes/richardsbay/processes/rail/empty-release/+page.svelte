<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types/wagon';
	import { page } from '$app/stores';

	let wagonSearch = '';
	let isSubmitting = false;
	let currentStep = 1;

	let availableWagons: Wagon[] = [];
	let filteredWagons: Wagon[] = [];
	let checkedWagons: Record<string, boolean> = {};
	$: selectedCount = Object.values(checkedWagons).filter(Boolean).length;
	$: allSelected = filteredWagons.length > 0 && filteredWagons.every(w => checkedWagons[w.id]);

	function toggleSelectAll() {
		const updated = { ...checkedWagons };
		filteredWagons.forEach(w => { updated[w.id] = !allSelected; });
		checkedWagons = updated;
	}

	const processSteps = ['Wagon', 'Verification'];
	let processLayout: ProcessLayout;

	let existingIdsArray: string[] = [];
	$: existingIdsArray = ($page.url.searchParams.get('wagonIds') || '').split(',').filter(Boolean);

	onMount(async () => {
		availableWagons = (await indexedDBService.getAllRecords('wagons')).filter(
			wagon => !wagon.releaseTimestamp && wagon.dispatchTimestamp && wagon.wagonIdSimple
		);
	});

	$: filteredWagons = availableWagons.filter(wagon =>
		wagon.wagonId?.toLowerCase().includes(wagonSearch.toLowerCase())
	);

	function handleWagonCheck(id: string, checked: boolean) {
		checkedWagons = { ...checkedWagons, [id]: checked };
	}

	async function handleSubmit() {
		try {
			isSubmitting = true;
			processLayout.setError('');

			const toRelease = filteredWagons.filter(wagon => checkedWagons[wagon.id]);
			if (toRelease.length === 0) {
				processLayout.setError('Please select at least one wagon.');
				return;
			}

			for (const wagon of toRelease) {
				await indexedDBService.updateRecord('wagons', wagon.id, {
					...wagon,
					syncStatus: 'pending',
					releaseTimestamp: new Date(),
					isWireSynced: false
				});
			}

			const dispatchedIds = [
				...(existingIdsArray),
				...toRelease.map(w => w.id)
			];
			goto(`/richardsbay/processes/rail/empty-release/review?wagonIds=${dispatchedIds.join(',')}`);
		} catch (error) {
			console.error('Failed to submit wagon release:', error);
			processLayout.setError('Failed to submit wagon release. Please try again.');
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
		<p class="text-gray-500">Search and select wagons to release.</p>
	</div>
	<div class="space-y-4">
		<div>
			<label for="wagonSearch" class="block text-sm font-medium text-gray mb-1">Search by wagon ID</label>
			<input
				id="wagonSearch"
				type="text"
				bind:value={wagonSearch}
				placeholder="Search Wagon ID"
				class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
			/>
		</div>

		<div class="flex items-center justify-between">
			{#if filteredWagons.length > 0}
				<span
					role="button"
					tabindex="0"
					class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer select-none transition-all
						{allSelected ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900'}"
					on:click={toggleSelectAll}
					on:keydown={(e) => e.key === 'Enter' && toggleSelectAll()}
				>
					<div class="flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center
						{allSelected ? 'border-white' : 'border-current'}">
						{#if allSelected}
							<svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</div>
					{allSelected ? 'Deselect all' : 'Select all'}
				</span>
			{:else}
				<div></div>
			{/if}
			<div>
				{#if selectedCount > 0}
					<span class="inline-flex items-center rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-white">
						{selectedCount} selected
					</span>
				{/if}
			</div>
		</div>

		{#if filteredWagons.length === 0}
			<p class="text-sm italic text-gray-400 text-center py-6">No wagons found.</p>
		{:else}
			<div class="rounded-lg border border-gray-200 p-2 space-y-2" style="max-height: 18rem; overflow-y: auto; position: relative">
				{#each filteredWagons as wagon}
					{@const isSelected = checkedWagons[wagon.id] || false}
					<label
						class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all select-none
							{isSelected
								? 'border-gray-700 bg-gray-50 shadow-sm'
								: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}"
					>
						<input
							type="checkbox"
							class="sr-only"
							checked={isSelected}
							on:change={(e) => {
								const target = e.target as HTMLInputElement | null;
								if (target) handleWagonCheck(wagon.id, target.checked);
							}}
						/>
						<div class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
							{isSelected ? 'bg-gray-700 border-gray-700' : 'border-gray-300 bg-white'}">
							{#if isSelected}
								<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</div>
						<span class="text-sm font-medium {isSelected ? 'text-gray-900' : 'text-gray-700'}">
							{wagon.wagonIdSimple}
						</span>
					</label>
				{/each}
			</div>
		{/if}
	</div>
</ProcessLayout>
