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
		ArrowLeft,
		HeartOff,
		Magnet
	} from 'lucide-svelte';

	const processes = [
		{
			name: 'Marshaling Yard',
			icon: ArrowRightCircle,
			color: 'text-green-500',
			href: '/pmc/processes/magnetite-rail/marshaling-yard'
		},
		{
			name: 'West Load Out',
			icon: ArrowRightCircle,
			color: 'text-green-500',
			href: '/pmc/processes/magnetite-rail/west-load-out'
		},
		{
			name: 'East Load Out',
			icon: Train,
			color: 'text-red-500',
			href: '/pmc/processes/magnetite-rail/east-load-out'
		}
	] as const;

</script>

<section class="space-y-4 px-4">
	<!-- Back to Locations Button -->
	<button
		on:click={() => goto('/pmc/processes')}
		class="flex items-center gap-2 mb-4 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
	>
		<ArrowLeft size={20} />
		<span>Back to Process</span>
	</button>
	
	<p class="mms-title ">Select a Workflow</p>
		{#each processes as { name, icon: Icon, color, href }}
			<button
				on:click={() => goto(href)}
				class={`flex w-full transform items-center gap-4 rounded-lg border-1 border-gray-100 px-5 py-4 shadow-lg transition-transform
				  hover:-translate-y-1 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:outline-nonem font-bold text-white text-uppercase bg-gray text-center text-white`}
			>
				<span class="flex-1 ">{name}</span>
			</button>
		{/each}
</section>
