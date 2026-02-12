<script lang="ts">
	import { goto } from '$app/navigation';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { onMount } from 'svelte';
	import { syncService } from '$lib/services/syncService';

	let allowedLocations: any = [];

	let showConfirmPopup = false;
	let showPasswordPopup = false;
	let pendingCount = 0;
	let password = '';
	let errorMsg = '';
	let clearing = false;
	let allowedusers: string[] = ['jonathan@claervolker.com', 'wihann@claervolker.com', 'wilbur@mmswire.com'];

	type StoreName = 'wagons' | 'trucks' | 'assays' | 'samples' | 'trains' | 'operationQueue' | 'tags' | 'consignments' | 'trainDispatches' | 'truckLoads' | 'shuntingTrains' | 'truckArrivals' | 'trainArrivals' | 'fleet' | 'dedicatedFleetTrucks';

	async function openSettingsPopup() {
		// Count pending records in all relevant stores
		const stores: StoreName[] = [
			'wagons', 'trucks', 'assays', 'samples', 'trains',
			'operationQueue', 'tags', 'consignments', 'trainDispatches',
			'truckLoads', 'shuntingTrains', 'truckArrivals', 'trainArrivals',
			'fleet', 'dedicatedFleetTrucks'
		];
		let total = 0;
		for (const store of stores) {
			const records = await indexedDBService.getRecords(store, (rec: any) => rec.syncStatus === 'pending');
			total += records.length;
		}
		pendingCount = total;
		password = '';
		errorMsg = '';
		showConfirmPopup = true;
		showPasswordPopup = false;
		clearing = false;
	}


	function closeConfirmPopup() {
		showConfirmPopup = false;
		password = '';
		errorMsg = '';
		clearing = false;
	}

	function closePasswordPopup() {
		showPasswordPopup = false;
		password = '';
		errorMsg = '';
		clearing = false;
	}


	function handleConfirmClear() {
		showConfirmPopup = false;
		showPasswordPopup = true;
		password = '';
		errorMsg = '';
	}

	async function handleClearIndexDB() {
		errorMsg = '';
		if (password.trim() === '') {
			// Do nothing, no error display
			return;
		}
		clearing = true;
		try {
			// Use current user's email
			const user = pocketbaseService.currentUser;
			if (!user) {
				errorMsg = 'Not authenticated.';
				clearing = false;
				return;
			}
			await pocketbaseService.login(user.email, password);

			// Try one last sync if there are pending records
			if (pendingCount > 0) {
				try {
					await syncService.syncAllPending();
				} catch (e) {
					// Ignore sync errors, still proceed to clear
				}
			}

			// Clear all stores
			const stores: StoreName[] = [
				'wagons', 'trucks', 'assays', 'samples', 'trains',
				'operationQueue', 'tags', 'consignments', 'trainDispatches',
				'truckLoads', 'shuntingTrains', 'truckArrivals', 'trainArrivals',
				'fleet', 'dedicatedFleetTrucks'
			];
			for (const store of stores) {
				await indexedDBService.clearStore(store);
			}
			// Refill the indexDB from PocketBase
			await syncService.fetchAll();
			showPasswordPopup = false;
			password = '';
			errorMsg = '';
			clearing = false;
		} catch (e) {
			errorMsg = 'Incorrect password.';
			clearing = false;
		}
	}

	const locations = [
		{ name: 'PMC', route: '/pmc/processes' },
		{ name: 'Bosveld', route: '/bosveld/processes' },
		{ name: 'Richards Bay', route: '/richardsbay/processes' }
	] as const;

	function normalize(str: string) {
		return str.replace(/\s+/g, '').toUpperCase();
	}

	$: visibleLocations = locations.filter((loc) =>
		allowedLocations.map(normalize).includes(normalize(loc.name))
	);

	onMount(async () => {
		allowedLocations = pocketbaseService.currentUser?.allowedLocations || [];
	});
</script>

<section class="space-y-4 px-4">
	<div class="relative mb-4 flex items-center justify-center">
		<h1 class="text-gray w-full text-center text-2xl font-semibold">Locations</h1>
		{#if allowedusers.includes(pocketbaseService.currentUser?.email || '')}
			<button
				class="absolute top-1/2 right-0 ml-4 -translate-y-1/2 rounded-full bg-white p-1 transition hover:bg-gray-200"
				aria-label="Settings"
				style="background-color: #F9F9F9;"
				on:click={openSettingsPopup}
			>
				<svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M12 21a8.985 8.985 0 0 1-1.755-.173 1 1 0 0 1-.791-.813l-.273-1.606a6.933 6.933 0 0 1-1.32-.762l-1.527.566a1 1 0 0 1-1.1-.278 8.977 8.977 0 0 1-1.756-3.041 1 1 0 0 1 .31-1.092l1.254-1.04a6.979 6.979 0 0 1 0-1.524L3.787 10.2a1 1 0 0 1-.31-1.092 8.977 8.977 0 0 1 1.756-3.042 1 1 0 0 1 1.1-.278l1.527.566a6.933 6.933 0 0 1 1.32-.762l.274-1.606a1 1 0 0 1 .791-.813 8.957 8.957 0 0 1 3.51 0 1 1 0 0 1 .791.813l.273 1.606a6.933 6.933 0 0 1 1.32.762l1.527-.566a1 1 0 0 1 1.1.278 8.977 8.977 0 0 1 1.756 3.041 1 1 0 0 1-.31 1.092l-1.254 1.04a6.979 6.979 0 0 1 0 1.524l1.254 1.04a1 1 0 0 1 .31 1.092 8.977 8.977 0 0 1-1.756 3.041 1 1 0 0 1-1.1.278l-1.527-.566a6.933 6.933 0 0 1-1.32.762l-.273 1.606a1 1 0 0 1-.791.813A8.985 8.985 0 0 1 12 21zm-.7-2.035a6.913 6.913 0 0 0 1.393 0l.247-1.451a1 1 0 0 1 .664-.779 4.974 4.974 0 0 0 1.696-.975 1 1 0 0 1 1.008-.186l1.381.512a7.012 7.012 0 0 0 .7-1.206l-1.133-.939a1 1 0 0 1-.343-.964 5.018 5.018 0 0 0 0-1.953 1 1 0 0 1 .343-.964l1.124-.94a7.012 7.012 0 0 0-.7-1.206l-1.38.512a1 1 0 0 1-1-.186 4.974 4.974 0 0 0-1.688-.976 1 1 0 0 1-.664-.779l-.248-1.45a6.913 6.913 0 0 0-1.393 0l-.25 1.45a1 1 0 0 1-.664.779A4.974 4.974 0 0 0 8.7 8.24a1 1 0 0 1-1 .186l-1.385-.512a7.012 7.012 0 0 0-.7 1.206l1.133.939a1 1 0 0 1 .343.964 5.018 5.018 0 0 0 0 1.953 1 1 0 0 1-.343.964l-1.128.94a7.012 7.012 0 0 0 .7 1.206l1.38-.512a1 1 0 0 1 1 .186 4.974 4.974 0 0 0 1.688.976 1 1 0 0 1 .664.779zm.7-3.725a3.24 3.24 0 0 1 0-6.48 3.24 3.24 0 0 1 0 6.48zm0-4.48A1.24 1.24 0 1 0 13.24 12 1.244 1.244 0 0 0 12 10.76z"
					/>
				</svg>
			</button>
		{/if}
	</div>

	{#each visibleLocations as { name, route }}
		<button
			on:click={() => goto(route)}
			class="focus:outline-nonem text-uppercase bg-gray flex w-full transform items-center gap-4 rounded-lg border-1 border-gray-100 px-5
			py-4 text-center font-bold text-white text-white shadow-lg transition-transform hover:-translate-y-1 hover:shadow-lg focus:ring-2 focus:ring-blue-500"
		>
			<span class="flex-1">{name}</span>
		</button>
	{/each}

	{#if showConfirmPopup}
		<div class="fixed inset-0 flex items-center justify-center z-50" style="background: rgba(0,0,0,0.3);">
			<div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
				<div class="mb-4 text-lg font-semibold">Are you sure you want to clear the indexDB?</div>
				{#if pendingCount > 0}
					<div class="mb-2">There are {pendingCount} still pending. Clearing the indexDB will lose those data.</div>
				{/if}
				<div class="flex justify-center gap-4">
					<button class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" on:click={closeConfirmPopup} disabled={clearing}>Cancel</button>
					<button class="px-4 py-2 rounded text-white" style="background-color:#dc2626;" on:click={handleConfirmClear} disabled={clearing}>
						Clear indexDB
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showPasswordPopup}
		<div class="fixed inset-0 flex items-center justify-center z-50" style="background: rgba(0,0,0,0.3);">
			<div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
				<div class="mb-4 text-lg font-semibold">Enter your password to confirm</div>
				<div class="mb-4">
					<input
						type="password"
						class="border rounded px-3 py-2 w-full"
						placeholder="Password"
						bind:value={password}
						disabled={clearing}
					/>
				</div>
				{#if errorMsg}
					<div class="mb-2 text-red-600">{errorMsg}</div>
				{/if}
				<div class="flex justify-center gap-4">
					<button class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" on:click={closePasswordPopup} disabled={clearing}>Cancel</button>
					<button class="px-4 py-2 rounded text-white" style="background-color:#dc2626;" on:click={handleClearIndexDB} disabled={clearing}>
						{clearing ? 'Clearing...' : 'Confirm'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</section>
