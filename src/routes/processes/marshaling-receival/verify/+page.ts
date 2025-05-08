import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { toast } from 'svelte-sonner';

export const load = async ({ url }) => {
    const id = url.searchParams.get('id');
    return {
        wagonId: id
    };
};
