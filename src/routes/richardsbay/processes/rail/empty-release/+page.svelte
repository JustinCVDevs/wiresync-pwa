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
	<div class="form">
		<label for="wagonSearch" class="block font-medium text-gray text-sm mb-1">Search Wagon ID</label>
		<input
			id="wagonSearch"
			type="text"
			bind:value={wagonSearch}
			placeholder="Search Wagon ID"
			class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
		/>
	</div>
	<div class="wagon-list mt-4">
		{#if filteredWagons.length === 0}
			<p class="text-gray-400 italic">No wagons found.</p>
		{:else}
			<div class="wagon-list-scroll">
				<ul>
					{#each filteredWagons as wagon}
						<li class="flex items-center justify-between border-b py-2">
							<span class="text-gray-800">{wagon.wagonIdSimple}</span>
							<input
								type="checkbox"
								class="w-5 h-5"
								checked={checkedWagons[wagon.id] || false}
								on:change={(e) => {
                                    const target = e.target as HTMLInputElement | null;
                                    if (target) {
                                        handleWagonCheck(wagon.id, target.checked);
                                    }
                                }}
							/>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
	.wagon-list ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.wagon-list li {
		padding-left: 0.5rem;
		padding-right: 0.5rem;
	}
	.wagon-list-scroll {
		max-height: 350px;
		overflow-y: auto;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		background: #fff;
	}
</style>
