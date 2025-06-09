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
		Droplet
	} from 'lucide-svelte';

	const processes = [
		{
			name: 'Marshaling Receival',
			icon: ReceiptText,
			color: 'text-blue-500',
			href: '/pmc/processes/marshaling-receival'
		},
		{
			name: 'Marshaling Dispatch',
			icon: ArrowRightCircle,
			color: 'text-green-500',
			href: '/pmc/processes/marshaling-dispatch'
		},
		{
			name: 'West Loadout (Wagons)',
			icon: Train,
			color: 'text-red-500',
			href: '/pmc/processes/west-loadout'
		},
		{
			name: 'East Loadout (Wagons)',
			icon: Train,
			color: 'text-orange-500',
			href: '/pmc/processes/east-loadout'
		},
		{
			name: 'Gravelotte (Trucks)',
			icon: Truck,
			color: 'text-teal-500',
			href: '/pmc/processes/gravelotte'
		},
		{
			name: 'Truck Loadout',
			icon: HardDrive,
			color: 'text-purple-500',
			href: '/pmc/processes/truck-loadout'
		},
		{
			name: 'Copper Truck Loadout',
			icon: Package,
			color: 'text-amber-500',
			href: '/pmc/processes/copper-truck-loadout'
		},
		{
			name: 'Acid Truck',
			icon: Droplet,
			color: 'text-pink-500',
			href: '/pmc/processes/acid-truck'
		}
	] as const;

</script>

<section class="space-y-4 px-4">
<p class="mms-title ">Select a Process</p>
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
