// src/lib/stores/marshaling.ts
import { writable } from 'svelte/store';
import type { TrainDispatch, Train, Consignment, Wagon } from '$lib/types';

export const draft = writable<{
    dispatch?: TrainDispatch;
    train?: Train;
    consignments?: Consignment[];
    wagons?: Wagon[];
}>({});
