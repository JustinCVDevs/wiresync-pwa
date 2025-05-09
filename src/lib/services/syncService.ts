import { indexedDBService } from './indexedDBService';
import { pocketbaseService } from './pocketbaseService';
import type { Assay } from '$lib/types/assay';
import type { Wagon } from '$lib/types/wagon';

export const syncService = {
    // Assay sync methods
    async syncAssay(assay: Assay) {
        try {
            const { id, syncStatus, ...payload } = assay;
            
            if (assay.serverId) {
                // Check all linked wagons have server IDs before updating
                if (assay.linkedWagonIds?.length) {
                    const wagons = await Promise.all(
                        assay.linkedWagonIds.map(id => 
                            indexedDBService.getRecord('wagons', id)
                        )
                    );
                    
                    // Check if all wagons have server IDs
                    const allWagonsHaveServerId = wagons.every(wagon => wagon?.serverId);
                    if (!allWagonsHaveServerId) {
                        console.warn('Waiting for all wagons to sync before updating assay');
                        return false;
                    }

                    // Replace local IDs with server IDs
                    payload.linkedWagonIds = wagons
                        .map(wagon => wagon?.serverId)
                        .filter((id): id is string => id !== undefined);
                }

                // Update existing record in PocketBase
                const created = await pocketbaseService.update('assays', assay.serverId, payload);
                
                if (assay.id) {
                    await indexedDBService.updateRecord('assays', assay.id, {
                        ...assay,
                        syncStatus: 'synced',
                        serverId: created.id
                    });
                }
            } else {
                // For new records, only create if there are no linked wagons
                if (!assay.linkedWagonIds?.length) {
                    const created = await pocketbaseService.create('assays', payload);
                    if (assay.id) {
                        await indexedDBService.updateRecord('assays', assay.id, {
                            ...assay,
                            syncStatus: 'synced',
                            serverId: created.id
                        });
                    }
                }
            }
            return true;
        } catch (err) {
            console.warn('Failed to sync with PocketBase, will retry later:', err);
            return false;
        }
    },

    // Add other sync methods as needed
    async syncPendingAssays() {
        const pending = await indexedDBService.getRecords(
            'assays',
            (rec: { syncStatus: string }) => rec.syncStatus === 'pending'
        );

        for (const assay of pending) {
            await this.syncAssay(assay);
        }
    },

    // Wagon sync methods
    async syncWagon(wagon: Wagon) {
        try {
            const { id, syncStatus, ...payload } = wagon;
            
            let created;
            if (wagon.serverId) {
                // Update existing record in PocketBase
                created = await pocketbaseService.update('wagons', wagon.serverId, payload);
            } else {
                // Create new record in PocketBase
                created = await pocketbaseService.create('wagons', payload);
            }
            
            if (wagon.id) {
                await indexedDBService.updateRecord('wagons', wagon.id, {
                    ...wagon,
                    syncStatus: 'synced',
                    serverId: created.id
                });
            }
            return true;
        } catch (err) {
            console.warn('Failed to sync wagon with PocketBase:', err);
            return false;
        }
    },

    async syncPendingWagons() {
        const pending = await indexedDBService.getRecords(
            'wagons',
            (rec: { syncStatus: string }) => rec.syncStatus === 'pending'
        );

        for (const wagon of pending) {
            await this.syncWagon(wagon);
        }
    },

    // Generic sync all pending records
    async syncAllPending() {
        await Promise.all([
            this.syncPendingAssays(),
            this.syncPendingWagons()
        ]);
    },

    async syncTruckList() {
        try {
            const response = await pocketbaseService.list('trucks');
            for (const truck of response.items) {
                await indexedDBService.saveRecord('trucks', {
                    id: truck.id,
                    registration: truck.registration,
                    syncStatus: 'synced',
                    serverId: truck.id
                });
            }
            return true;
        } catch (err) {
            console.warn('Failed to sync truck list:', err);
            return false;
        }
    },

    async syncTrainList() {
        try {
            const response = await pocketbaseService.list('trains');
            for (const train of response.items) {
                await indexedDBService.saveRecord('trains', {
                    id: train.id,
                    refNr: train.refNr,
                    serverId: train.id,
                    rfidNr: train.rfidNr,
                    syncStatus:'synced'
                });
            }
            return true;
        } catch (err) {
            console.warn('Failed to sync train list:', err);
            return false;
        }
    },

    async syncConsignmentList() {
        try {
            const response = await pocketbaseService.list('consignments');
            for (const consignment of response.items) {
                await indexedDBService.saveRecord('consignments', {
                    id: consignment.id,
                    name: consignment.name,
                    linkedTrainId: consignment.linkedTrainId,
                    syncStatus: 'synced',
                    serverId: consignment.id
                });
            }
            return true;
        } catch (err) {
            console.warn('Failed to sync consignment list:', err);
            return false;
        }
    }
};