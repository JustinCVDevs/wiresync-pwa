<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib';
	import { goto } from '$app/navigation';

	let wagonData: Wagon | null = null;
	let error = '';
	let isEditing = false;

	onMount(async () => {
		try {
			const wagonId = page.url.searchParams.get('id');
			if (!wagonId) {
				error = 'No wagon ID provided';
				return;
			}

			const record = await indexedDBService.getRecord('wagons', wagonId);
			wagonData = record || null; // Convert undefined to null

			if (!wagonData) {
				error = 'Wagon data not found';
			}
		} catch (err) {
			error = 'Failed to load wagon data';
			console.error(err);
		}
	});

	function onEdit() {
		isEditing = true;
	}

	async function onVerify() {
		if (!wagonData || !wagonData.id) return;

		try {
			// Update the record with verified data
			await indexedDBService.updateRecord('wagons', wagonData.id, {
				...wagonData,
				syncStatus: 'pending',
				updated: new Date().toISOString()
			});

			// Redirect to completion page or process list
			goto('/processes');
		} catch (err) {
			error = 'Failed to update wagon data';
			console.error(err);
		}
	}
	let currentStep = 2;
	// Add save function for edit mode
	async function onSave() {
		if (!wagonData || !wagonData.id) return;
		isEditing = false;

		try {
			await indexedDBService.updateRecord('wagons', wagonData.id, {
				...wagonData,
				updated: new Date().toISOString()
			});
		} catch (err) {
			error = 'Failed to save changes';
			console.error(err);
		}
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
	<!-- Progress Steps -->
	<div class="mb-4 flex justify-between px-6 pt-4">
		<div class="flex flex-col items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep >= 1
					? 'bg-green-500 text-white'
					: 'bg-gray-300'}"
			>
				1
			</div>
			<span class="mt-1 text-xs">RFID Tag Linking</span>
		</div>
		<div class="h-1 flex-1 self-center {currentStep >= 2 ? 'bg-green-500' : 'bg-gray-300'}"></div>
		<div class="flex flex-col items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep >= 2
					? 'bg-green-500 text-white'
					: 'bg-gray-300'}"
			>
				2
			</div>
			<span class="mt-1 text-xs">Verification</span>
		</div>
	</div>

	{#if error}
		<div class="error">{error}</div>
	{:else if wagonData}
		<form method="POST" use:enhance>
			<div class="mb-6 rounded border border-gray-200 bg-gray-50 p-4">
				<p class="mb-3 text-xl text-gray-900">Verification</p>
				<p class="mb-4 text-gray-700">Please verify results below.</p>
				<div class="space-y-3">
					<div class="flex items-center rounded border border-gray-200 bg-white px-3 py-2">
						<span class="w-36 text-gray-600">Wagon RFID Nr.</span>
						{#if isEditing}
							<input
								name="rfidNumber"
								type="text"
								bind:value={wagonData.transcoreTag}
								class="w-full border-none bg-transparent font-medium text-gray-800 focus:outline-none"
							/>
						{:else}
							<span class="font-medium text-gray-800">{wagonData.transcoreTag}</span>
						{/if}
					</div>
					<div class="flex items-center rounded border border-gray-200 bg-white px-3 py-2">
						<span class="w-36 text-gray-600">Wagon ID/Nr.</span>
						{#if isEditing}
							<input
								name="wagonNumber"
								type="text"
								bind:value={wagonData.wagonIdSimple}
								class="w-full border-none bg-transparent font-medium text-gray-800 focus:outline-none"
							/>
						{:else}
							<span class="font-medium text-gray-800">{wagonData.wagonIdSimple}</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="flex space-x-4">
				{#if isEditing}
					<button
						type="button"
						on:click={onSave}
						class="flex-1 rounded bg-green-600 py-2 font-semibold text-white hover:bg-green-700"
					>
						Save
					</button>
				{:else}
					<button
						type="button"
						on:click={onEdit}
						class="flex-1 rounded bg-red-600 py-2 font-semibold text-white hover:bg-red-700"
					>
						Edit
					</button>
				{/if}
				<button
					type="button"
					on:click={onVerify}
					class="flex-1 rounded bg-gray-800 py-2 font-semibold text-white hover:bg-gray-900"
				>
					Verify
				</button>
			</div>
		</form>
	{:else}
		<div>Loading...</div>
	{/if}
</div>
