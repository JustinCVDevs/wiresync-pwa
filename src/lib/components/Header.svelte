<script>
	import { pocketbaseService } from '$lib/services/pocketbaseService';

	export let user = {
		name: 'Philip Mare',
		org: 'PMC',
		status: 'Online',
		syncedAt: '07:48:44'
	};

	function handleLogout() {
		// your logout logic
		console.log('logging out');
	}
</script>

<div class="space-y-2">
	<!-- Section label -->

	<!-- Card -->
	<div class="flex items-center justify-between bg-gray-800 p-4 text-white">
		<!-- User info -->
		<div class="text-sm">
			<span class="font-medium">User</span>
			<span class="font-semibold">{user.name}</span>
			<span class="opacity-75">{user.org}</span>
		</div>

		<!-- Status & sync time -->
		<div class="flex flex-col items-center">
			<span class="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
				{user.status}
			</span>
			<span class="mt-1 text-xs opacity-75">
				Synced at {user.syncedAt}
			</span>
		</div>

		<!-- Logout button -->
		<button
			on:click={handleLogout}
			class="rounded bg-gray-700 px-3 py-1 text-sm font-medium text-white hover:bg-gray-600"
		>
			Log Out
		</button>
	</div>
</div>
