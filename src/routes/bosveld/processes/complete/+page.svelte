<script lang=ts>
	import { goto } from "$app/navigation";
	import { CheckCircle } from "lucide-svelte";
	import { onMount } from "svelte";

    onMount(async () => {
       setTimeout(() => {
            goto("/bosveld/processes");
       }, 3000);
    });

</script>
<div class="bg-green-600 text-white border rounded-lg shadow-lg flex p-4" style="background: #91f1b5;color: #2f3c33;"><CheckCircle class="mr-4"/> Process Complete</div>