<script lang="ts">
	import { onMount } from 'svelte';
	import type { Location } from '$lib/types';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card/index';

	import { MapPin, List, ArrowLeft, Loader2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	let locations: Location[] = [];
	let loading = false;
	let loadingMessage = 'Loading...';
	let error: string | null = null;

	let selectedLocation: Location | null = null;
	let processInstanceId: string | null = null;

	type View = 'locations' | 'processes' | 'steps';
	let view: View = 'locations';

	function handleSelectLocation(loc: Location) {
		selectedLocation = loc;
		view = 'processes';
	}

	function handleStepSave(data: any) {
		/* stub */
	}
	function handleStepComplete() {
		/* stub */
	}
	function resetWorkflow() {
		selectedLocation = null;
		processInstanceId = null;
		view = 'locations';
	}
</script>

<div class="container mx-auto max-w-5xl px-4 py-8 pb-16">
	<header class="mb-8">
		<Card class="bg-card border-primary/20">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<div>
						<CardTitle class="text-3xl font-bold">
							{#if view === 'locations'}Select Location{/if}
							{#if view === 'processes'}{selectedLocation?.name}{/if}
						</CardTitle>
						<CardDescription class="mt-1 text-lg">
							{#if view === 'locations'}Choose a location{/if}
							{#if view === 'processes'}Select a process{/if}
						</CardDescription>
					</div>
					<div class="flex items-center space-x-4">
						{#if view !== 'locations'}
							<Button
								variant="outline"
								size="sm"
								on:click={() => {
									if (view === 'processes') resetWorkflow();
									if (view === 'steps') {
										view = 'processes';
									}
								}}
							>
								<ArrowLeft class="mr-2 h-4 w-4" />
								{view === 'processes' ? 'Back to Locations' : 'Back to Processes'}
							</Button>
						{/if}
					</div>
				</div>
			</CardHeader>
		</Card>
	</header>

	<div class="mb-10">
		{#if loading}
			<div class="py-8 text-center">
				<Loader2 class="text-primary h-8 w-8 animate-spin" />
				<p class="text-muted-foreground mt-2">{loadingMessage}</p>
			</div>
		{:else if error}
			<div class="py-8 text-center">
				<div class="bg-destructive/10 text-destructive rounded-md p-4">
					<h3 class="font-medium">Error</h3>
					<p>{error}</p>
				</div>
				<Button variant="outline" class="mt-4">Retry</Button>
			</div>
		{:else if view === 'locations'}
			<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#if locations.length === 0}
					<div class="col-span-full py-6 text-center">
						<p class="text-muted-foreground">No locations available</p>
						<Button variant="outline" class="mt-2">Refresh Locations</Button>
					</div>
				{:else}
					{#each locations as loc}
						<Card
							class="hover:bg-accent cursor-pointer transition-colors"
							on:click={() => handleSelectLocation(loc)}
						>
							<CardHeader class="flex items-center justify-between pb-2">
								<CardTitle class="text-lg font-medium">{loc.name}</CardTitle>
								<MapPin class="text-muted-foreground h-5 w-5" />
							</CardHeader>
							<CardContent>
								<CardDescription>{loc.description || 'No description'}</CardDescription>
							</CardContent>
						</Card>
					{/each}
				{/if}
			</div>
		{:else if view === 'processes'}
			<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<!-- {#if processes.length === 0} -->
				<div class="col-span-full py-6 text-center">
					<p class="text-muted-foreground">No processes available</p>
					<Button variant="outline" class="mt-2">Refresh Processes</Button>
				</div>
				<!-- {:else}
					{#each processes as proc}
						<Card
							class="hover:bg-accent cursor-pointer transition-colors"
							on:click={() => handleSelectProcess(proc)}
						>
							<CardHeader class="flex items-center justify-between pb-2">
								<CardTitle class="text-lg font-medium">{proc.name}</CardTitle>
								<List class="text-muted-foreground h-5 w-5" />
	 						</CardHeader>
							<CardContent>
								<CardDescription>{proc.description || 'No description'}</CardDescription>
								{#if proc.active}
									<span
										class="mt-2 inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset"
										>Active</span
									>
								{:else}
									<span
										class="mt-2 inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset"
										>Inactive</span
									>
								{/if}
							</CardContent>
						</Card>
					{/each}
				{/if} -->
			</div>
		{:else if !processInstanceId}
			<div class="p-8 text-center">
				<p class="text-muted-foreground">No step or instance.</p>
				<Button variant="outline" class="mt-2" on:click={resetWorkflow}>Back</Button>
			</div>
		{:else}
			<div class="text-muted-foreground mt-6 text-center">[ProcessStepForm]</div>
			<div class="mt-4 flex justify-end space-x-2">
				<Button on:click={handleStepSave}>Save</Button>
				<Button on:click={handleStepComplete}>Complete</Button>
			</div>
		{/if}
	</div>
</div>
