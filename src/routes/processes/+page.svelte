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
			href: '/processes/marshaling-receival'
		},
		{
			name: 'Marshaling Dispatch',
			icon: ArrowRightCircle,
			color: 'text-green-500',
			href: '/processes/marshaling-dispatch'
		},
		{
			name: 'West Loadout (Wagons)',
			icon: Train,
			color: 'text-red-500',
			href: '/processes/west-loadout'
		},
		{
			name: 'East Loadout (Wagons)',
			icon: Train,
			color: 'text-orange-500',
			href: '/processes/east-loadout'
		},
		{
			name: 'Gravelotte (Trucks)',
			icon: Truck,
			color: 'text-teal-500',
			href: '/processes/gravelotte'
		},
		{
			name: 'Truck Loadout',
			icon: HardDrive,
			color: 'text-purple-500',
			href: '/processes/truck-loadout'
		},
		{
			name: 'Copper Truck Loadout',
			icon: Package,
			color: 'text-amber-500',
			href: '/processes/copper-truck-loadout'
		},
		{
			name: 'Acid Truck',
			icon: Droplet,
			color: 'text-pink-500',
			href: '/processes/acid-truck'
		}
	] as const;

	const currentPath = derived(page, ($page) => $page.url.pathname);
</script>

<section class="mx-auto rounded-xl bg-white p-6 shadow-lg">
	<h1 class="mb-6 text-2xl font-semibold text-gray-900">PMC Processes</h1>
	<div class="space-y-4">
		{#each processes as { name, icon: Icon, color, href }}
			<button
				on:click={() => goto(href)}
				class={`flex w-full transform items-center gap-4 rounded-lg border-1 border-gray-100 px-5 py-4 shadow-lg transition-transform
				  hover:-translate-y-1 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
				  ${$currentPath === href ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-800'}`}
			>
				<Icon class={`h-6 w-6 flex-shrink-0 ${color}`} />
				<span class="flex-1 text-left">{name}</span>
			</button>
		{/each}
	</div>
</section>
