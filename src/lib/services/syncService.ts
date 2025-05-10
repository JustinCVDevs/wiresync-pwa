import { indexedDBService } from './indexedDBService';
import { pocketbaseService } from './pocketbaseService';
import type { Assay } from '$lib/types/assay';
import type { Wagon } from '$lib/types/wagon';
import type { TruckLoad } from '$lib/types/truckLoad';
import type { TrainDispatch } from '$lib/types/trainDispatch';


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

                    // Check all linked truck loads have server IDs before updating
                    if (assay.linkedTruckLoadIds?.length) {
                        const truckLoads = await Promise.all(
                            assay.linkedTruckLoadIds.map(id => 
                                indexedDBService.getRecord('truckLoads', id)
                            )
                        );
                        
                        // Check if all truck loads have server IDs
                        const allTruckLoadsHaveServerId = truckLoads.every(load => load?.serverId);
                        if (!allTruckLoadsHaveServerId) {
                            console.warn('Waiting for all truck loads to sync before updating assay');
                            return false;
                        }

                        // Replace local IDs with server IDs
                        payload.linkedTruckLoadIds = truckLoads
                            .map(load => load?.serverId)
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
                    // For new records, check linked items before creating
                    if (assay.linkedWagonIds?.length) {
                        const wagons = await Promise.all(
                            assay.linkedWagonIds.map(id => 
                                indexedDBService.getRecord('wagons', id)
                            )
                        );
                        
                        const allWagonsHaveServerId = wagons.every(wagon => wagon?.serverId);
                        if (!allWagonsHaveServerId) {
                            console.warn('Waiting for all wagons to sync before creating assay');
                            return false;
                        }

                        payload.linkedWagonIds = wagons
                            .map(wagon => wagon?.serverId)
                            .filter((id): id is string => id !== undefined);
                    }

                    if (assay.linkedTruckLoadIds?.length) {
                        const truckLoads = await Promise.all(
                            assay.linkedTruckLoadIds.map(id => 
                                indexedDBService.getRecord('truckLoads', id)
                            )
                        );
                        
                        const allTruckLoadsHaveServerId = truckLoads.every(load => load?.serverId);
                        if (!allTruckLoadsHaveServerId) {
                            console.warn('Waiting for all truck loads to sync before creating assay');
                            return false;
                        }

                        payload.linkedTruckLoadIds = truckLoads
                            .map(load => load?.serverId)
                            .filter((id): id is string => id !== undefined);
                    }

                    const created = await pocketbaseService.create('assays', payload);
                    if (assay.id) {
                        await indexedDBService.updateRecord('assays', assay.id, {
                            ...assay,
                            syncStatus: 'synced',
                            serverId: created.id
                        });
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
        },

        async syncTruckLoad(truckLoad: TruckLoad) {
            try {
                const { id, syncStatus, ...payload } = truckLoad;
                
                let created;
                if (truckLoad.serverId) {
                    created = await pocketbaseService.update('truckLoads', truckLoad.serverId, payload);
                } else {
                    created = await pocketbaseService.create('truckLoads', payload);
                }
                
                if (truckLoad.id) {
                    await indexedDBService.updateRecord('truckLoads', truckLoad.id, {
                        ...truckLoad,
                        syncStatus: 'synced',
                        serverId: created.id
                    });
                }
                return true;
            } catch (err) {
                console.warn('Failed to sync truck load with PocketBase:', err);
                return false;
            }
        },

        async syncPendingTruckLoads() {
            const pending = await indexedDBService.getRecords(
                'truckLoads',
                (rec: { syncStatus: string }) => rec.syncStatus === 'pending'
            );

            for (const truckLoad of pending) {
                await this.syncTruckLoad(truckLoad);
            }
        },

        async syncTrainDispatch(trainDispatch: TrainDispatch) {
            try {
                const { id, syncStatus, ...payload } = trainDispatch;
                
                let created;
                if (trainDispatch.serverId) {
                    // Check all linked wagons have server IDs before updating
                    if (trainDispatch.linkedWagonIds?.length) {
                        const wagons = await Promise.all(
                            trainDispatch.linkedWagonIds.map(id => 
                                indexedDBService.getRecord('wagons', id)
                            )
                        );
                        
                        // Check if all wagons have server IDs
                        const allWagonsHaveServerId = wagons.every(wagon => wagon?.serverId);
                        if (!allWagonsHaveServerId) {
                            console.warn('Waiting for all wagons to sync before updating train dispatch');
                            return false;
                        }

                        // Replace local IDs with server IDs
                        payload.linkedWagonIds = wagons
                            .map(wagon => wagon?.serverId)
                            .filter((id): id is string => id !== undefined);
                    }

                    created = await pocketbaseService.update('trainDispatches', trainDispatch.serverId, payload);
                } else {
                    created = await pocketbaseService.create('trainDispatches', payload);
                }
                
                if (trainDispatch.id) {
                    await indexedDBService.updateRecord('trainDispatches', trainDispatch.id, {
                        ...trainDispatch,
                        syncStatus: 'synced',
                        serverId: created.id
                    });
                }
                return true;
            } catch (err) {
                console.warn('Failed to sync train dispatch with PocketBase:', err);
                return false;
            }
        },

        async syncPendingTrainDispatches() {
            const pending = await indexedDBService.getRecords(
                'trainDispatches',
                (rec: { syncStatus: string }) => rec.syncStatus === 'pending'
            );

            for (const trainDispatch of pending) {
                await this.syncTrainDispatch(trainDispatch);
            }
        },

        // Update syncAllPending to include train dispatches
        async syncAllPending() {
            await Promise.all([
                this.syncPendingAssays(),
                this.syncPendingWagons(),
                this.syncPendingTruckLoads(),
                this.syncPendingTrainDispatches()
            ]);
        },
    }


    