<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
	import {
		ReceiptText,
		ArrowRightCircle,
		Train,
		Truck,
		HardDrive,
		Package,
		Droplet,
		ArrowLeft
	} from 'lucide-svelte';

	const processes = [
		{
			name: 'Truck Arrival',
			color: 'text-blue-500',
			href: '/richardsbay/processes/truck-arrival'
		},
		{
			name: 'Train Arrival',
			color: 'text-green-500',
			href: '/richardsbay/processes/train-arrival'
		},
		{
			name: 'Train Staging',
			color: 'text-red-500',
			href: '/richardsbay/processes/train-staging'
		},
		{
			name: 'Wagon Dispatch',
			color: 'text-orange-500',
			href: '/richardsbay/processes/wagon-dispatch'
		}
	] as const;

</script>

<section class="space-y-4 px-4">
	<!-- Back to Locations Button -->
	<button
		on:click={() => goto('/locations')}
		class="flex items-center gap-2 mb-4 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
	>
		<ArrowLeft size={20} />
		<span>Back to Locations</span>
	</button>
	
	<p class="mms-title ">Select a Process</p>
		{#each processes as { name, color, href }}
			<button
				on:click={() => goto(href)}
				class={`flex w-full transform items-center gap-4 rounded-lg border-1 border-gray-100 px-5 py-4 shadow-lg transition-transform
				  hover:-translate-y-1 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:outline-nonem font-bold text-white text-uppercase bg-gray text-center text-white`}
			>
				<span class="flex-1 ">{name}</span>
			</button>
		{/each}
</section>
