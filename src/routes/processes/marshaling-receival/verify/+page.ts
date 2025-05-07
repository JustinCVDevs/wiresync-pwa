import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { toast } from 'svelte-sonner';

export const load: PageLoad = ({ url }) => {
	console.log(url.searchParams);
	if (!url.searchParams.has('wagonId')) {


		// Display error message and redirect after a short delay
		setTimeout(() => {
			window.location.href = '/processes/marshaling-receival?error=No wagonId provided';
		}, 2000); // 2 second delay to allow toast message to be seen
	}
	if (url.searchParams.has('wagonrfid')) {
		console.log('has wagonrfid');
	}
	return {
		wagonId: url.searchParams.get('wagonId') || '',
		wagonrfid: url.searchParams.get('wagonrfid') || ''
	};
};
