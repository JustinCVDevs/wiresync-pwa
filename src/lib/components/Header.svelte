<script>
	import { goto } from '$app/navigation';
  import { pocketbaseService } from '$lib/services/pocketbaseService';
	import { onMount } from 'svelte';
  import LoginForm from './LoginForm.svelte';
  


  $: isAuthenticated = pocketbaseService.isAuthenticated;
  let showLoginForm = false;

  // Update online status based on network connectivity
  let online = true;
  let status = 'Online';
  
  function updateOnlineStatus() {
    online = navigator.onLine;
    status = online ? 'Online' : 'Offline';
  }

  // Add event listeners for online/offline status
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  function handleLogout() {
    pocketbaseService.logout();
    goto('/');
    
  }
  
</script>


<div class="bg-gray-700 grid grid-cols-3 grid-rows-1 gap-2 text-white py-2 px-3">
    
  <!-- User info -->
  <div class="text-sm">
    <span class="font-medium">Welcome Back,</span>
    <span class="font-semibold">{pocketbaseService.currentUser?.name}</span>
  </div>

  <!-- Status & sync time -->
  <div class="flex flex-col items-center">
    <span class="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
      {status}
    </span>
    <span class="mt-1 text-xs opacity-75">
      Synced at {new Date().toLocaleTimeString()}
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
