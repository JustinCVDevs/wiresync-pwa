<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import { indexedDBService } from '$lib/services/indexedDBService';

	let isSubmitting = false;
	let currentStep = 1;

	let availableTrains: ShuntingTrain[] = [];
	let selectedTrainIds: string[] = [];
	let trainSearch = '';
	let filteredShuntingTrains: ShuntingTrain[] = [];

	const processSteps = ['Shunting Train', 'Wagon Sampling', 'Verification'];

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

	function handleTrainCheck(trainId: string | undefined, checked: boolean) {
		if (!trainId) return;
		if (checked) {
			if (!selectedTrainIds.includes(trainId)) selectedTrainIds = [...selectedTrainIds, trainId];
		} else {
			selectedTrainIds = selectedTrainIds.filter(id => id !== trainId);
		}
	}

	onMount(async () => {
		const threeDaysAgo = new Date();
		threeDaysAgo.setHours(0, 0, 0, 0);
		threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
		const shuntingTrains = (await indexedDBService.getAllRecords('shuntingTrains')).filter(
			shunting => {
				if (!shunting.verificationTimestamp || shunting.siteLocation !== 'Bosveld' || !shunting.created) {
					return false;
				}

				const createdDate = new Date(shunting.created);
				createdDate.setHours(0, 0, 0, 0);
				return createdDate >= threeDaysAgo;
			}
		).sort((a, b) => {
			const dateA = a.created ? new Date(a.created).getTime() : 0;
			const dateB = b.created ? new Date(b.created).getTime() : 0;
			return dateB - dateA;
		});

		availableTrains = Array.from(new Map(shuntingTrains.map(train => [train.serverId, train])).values());
	});

	$: filteredShuntingTrains = availableTrains.filter(t => {
		if (!trainSearch) return true;
		return formatDate(t.postDate).toLowerCase().includes(trainSearch.toLowerCase());
	});

	$: allSelected = filteredShuntingTrains.length > 0 && filteredShuntingTrains.every(t => selectedTrainIds.includes(t.serverId ?? ''));

	function toggleSelectAll() {
		if (allSelected) {
			selectedTrainIds = selectedTrainIds.filter(id => !filteredShuntingTrains.some(t => (t.serverId ?? '') === id));
		} else {
			const toAdd = filteredShuntingTrains.map(t => t.serverId ?? '').filter(id => id && !selectedTrainIds.includes(id));
			selectedTrainIds = [...selectedTrainIds, ...toAdd];
		}
	}

	async function handleSubmit() {
		isSubmitting = true;
		try {
			if (!selectedTrainIds || selectedTrainIds.length === 0) {
				processLayout.setError('Please select at least one train reference number.');
				return;
			}

			const allShunting = await indexedDBService.getAllRecords('shuntingTrains');
			const selectedTrains = allShunting.filter((t: any) => selectedTrainIds.includes(t.serverId));
			if (!selectedTrains || selectedTrains.length === 0) {
				processLayout.setError(`No shunting train found.`);
				return;
			}

			let linkedWagonIds: string[] = [];
			for (const t of selectedTrains) {
				linkedWagonIds = linkedWagonIds.concat(t.linkedWagons || []);
			}

			const allWagons = await indexedDBService.getAllRecords('wagons');
			for (const wagonId of linkedWagonIds) {
				const wagon = allWagons.find(w => w.serverId === wagonId);
				if (wagon?.sampleTimestamp) {
					goto(`/bosveld/processes/loading-station/sampling/wagons/review?shuntingTrainIds=${selectedTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`);
					return;
				}
			}

			goto(`/bosveld/processes/loading-station/sampling/wagons?shuntingTrainIds=${selectedTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/bosveld/processes/loading-station');
	}
</script>

<ProcessLayout
	title="Train Sampling"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/bosveld/processes/loading-station"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Sampling</h5>
	</div>

	<div class="space-y-4">
		<div>
			<label for="trainSearch" class="block text-sm font-medium text-gray mb-1">Search by date</label>
			<input
				id="trainSearch"
				type="text"
				bind:value={trainSearch}
				placeholder="Search Train Date"
				class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
			/>
		</div>

		<div class="flex items-center justify-between">
			{#if filteredShuntingTrains.length > 0}
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
				{#if selectedTrainIds.length > 0}
					<span class="inline-flex items-center rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-white">
						{selectedTrainIds.length} selected
					</span>
				{/if}
			</div>
		</div>

		{#if filteredShuntingTrains.length === 0}
			<p class="text-sm italic text-gray-400 text-center py-6">No trains available.</p>
		{:else}
			<div class="relative max-h-72 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-2">
				{#each filteredShuntingTrains as train}
					{@const isSelected = selectedTrainIds.includes(train.serverId ?? '')}
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
								if (target) handleTrainCheck(train.serverId, target.checked);
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
							{formatDate(train.postDate)}
						</span>
					</label>
				{/each}
			</div>
		{/if}
	</div>
</ProcessLayout>
