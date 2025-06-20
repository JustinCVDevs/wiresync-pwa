import { indexedDBService } from './indexedDBService';
import { pocketbaseService } from './pocketbaseService';
import type { Assay } from '$lib/types/assay';
import type { Wagon } from '$lib/types/wagon';
import type { TruckLoad } from '$lib/types/truckLoad';
import type { TrainDispatch } from '$lib/types/trainDispatch';
import type { ShuntingTrain } from '$lib/types/shuntingTrain';

export const syncService = {
	// Assay sync methods
	async syncAssay(assay: Assay) {
		try {
			const { id, syncStatus, ...payload } = assay;

			if (assay.serverId) {
				// Check all linked wagons have server IDs before updating
				if (assay.linkedWagonIds?.length) {
					const wagons = await Promise.all(
						assay.linkedWagonIds.map((id) => indexedDBService.getRecord('wagons', id))
					);

					// Check if all wagons have server IDs
					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before updating assay');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedWagonIds = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				// Check all linked truck loads have server IDs before updating
				if (assay.linkedTruckLoadIds?.length) {
					const truckLoads = await Promise.all(
						assay.linkedTruckLoadIds.map((id) => indexedDBService.getRecord('truckLoads', id))
					);

					// Check if all truck loads have server IDs
					const allTruckLoadsHaveServerId = truckLoads.every((load) => load?.serverId);
					if (!allTruckLoadsHaveServerId) {
						console.warn('Waiting for all truck loads to sync before updating assay');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedTruckLoadIds = truckLoads
						.map((load) => load?.serverId)
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
						assay.linkedWagonIds.map((id) => indexedDBService.getRecord('wagons', id))
					);

					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before creating assay');
						return false;
					}

					payload.linkedWagonIds = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				if (assay.linkedTruckLoadIds?.length) {
					const truckLoads = await Promise.all(
						assay.linkedTruckLoadIds.map((id) => indexedDBService.getRecord('truckLoads', id))
					);

					const allTruckLoadsHaveServerId = truckLoads.every((load) => load?.serverId);
					if (!allTruckLoadsHaveServerId) {
						console.warn('Waiting for all truck loads to sync before creating assay');
						return false;
					}

					payload.linkedTruckLoadIds = truckLoads
						.map((load) => load?.serverId)
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
					syncStatus: 'synced'
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
						trainDispatch.linkedWagonIds.map((id) => indexedDBService.getRecord('wagons', id))
					);

					// Check if all wagons have server IDs
					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before updating train dispatch');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedWagonIds = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				created = await pocketbaseService.update(
					'trainDispatches',
					trainDispatch.serverId,
					payload
				);
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
	/**
	  * Remove any local records whose serverId
	  * no longer exists in PocketBase.
	  */
	async syncDeletedRecords(collectionName: any) {
		try {
			const serverIds = new Set<string>()
			const perPage = 50
			let page = 1
			let items: { id: string }[] = []

			// page through PocketBase
			do {
				const res = await pocketbaseService.list(collectionName, { page, perPage })
				items = res.items
				for (const it of items) serverIds.add(it.id)
				page++
			} while (items.length === perPage)

			// pull all local records that have a serverId
			const local = await indexedDBService.getRecords(
				collectionName,
				(rec: { serverId?: string }) => !!rec.serverId
			)

			// delete any local whose serverId isn't on the server
			for (const rec of local) {
				if (!serverIds.has(rec.serverId!)) {
					await indexedDBService.deleteRecord(collectionName, rec.id)
				}
			}

			return true
		} catch (err) {
			console.warn(
				`Failed to reconcile deletions for ${collectionName}:`,
				err
			)
			return false
		}
	}, 

	// ShuntingTrain sync methods
	async syncShuntingTrain(shuntingTrain: ShuntingTrain) {
		try {
			const { id, syncStatus, ...payload } = shuntingTrain;

			// Since shunting train always exists in PocketBase, we only update
			if (shuntingTrain.id) {
				// Check all linked wagons have server IDs before updating
				if (shuntingTrain.linkedWagons?.length) {
					const wagons = await Promise.all(
						shuntingTrain.linkedWagons.map((id) => indexedDBService.getRecord('wagons', id))
					);

					// Check if all wagons have server IDs (most will, but new ones might not)
					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before updating shunting train');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedWagons = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				// Update existing record in PocketBase
				const updated = await pocketbaseService.update('shuntingTrains', shuntingTrain.id, payload);

				if (shuntingTrain.id) {
					await indexedDBService.updateRecord('shuntingTrains', shuntingTrain.id, {
						...shuntingTrain,
						syncStatus: 'synced',
						id: updated.id
					});
				}
			} else {
				// This case should be rare since shunting trains always exist in PocketBase
				console.warn('ShuntingTrain missing serverId - this should not happen normally');
				return false;
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync shunting train with PocketBase, will retry later:', err);
			return false;
		}
	},

	// Add helper method for batch syncing
	async syncPendingShuntingTrains() {
		const pending = await indexedDBService.getRecords(
			'shuntingTrains',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const shuntingTrain of pending) {
			await this.syncShuntingTrain(shuntingTrain);
		}
	},

	async syncShuntingTrainList() {
		try {
			const response = await pocketbaseService.list('shuntingTrains');
			
			for (const train of response.items) {
				console.log(`💾 Saving shunting train ${train.id} to IndexedDB...`);
				await indexedDBService.saveRecord('shuntingTrains', {
					id: train.id,
					postDate: train.postDate,
					syncStatus: 'synced',
					created: train.created,
					updated: train.updated,
					linkedWagons: train.linkedWagons,
					verificationTimestamp: train.verificationTimestamp
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync shunting train list:', err);
			return false;
		}
	},

	async syncWagonList() {
		console.log('🚛 Starting syncWagonList...');
		try {
			console.log('📡 Fetching wagons from PocketBase...');
			const response = await pocketbaseService.list('wagons');
			console.log(`✅ Received ${response.items.length} wagons from server`);
			
			for (const wagon of response.items) {
				console.log(`💾 Saving wagon ${wagon.id} to IndexedDB...`);
				await indexedDBService.saveRecord('wagons', {
					id: wagon.id,
					transcoreTag: wagon.transcoreTag,
					wagonIdSimple: wagon.wagonIdSimple,
					wagonPhotoUrl: wagon.wagonPhotoUrl,
					componentType: wagon.componentType,
					verificationTs: wagon.verificationTs,
					linkedTrainId: wagon.linkedTrainId,
					linkedConsignmentId: wagon.linkedConsignmentId,
					weight: wagon.weight,
					samplingStatus: wagon.samplingStatus,
					serverId: wagon.id,
					syncStatus: 'synced',
					process: wagon.process,
					created: wagon.created,
					updated: wagon.updated
				});
			}
			console.log('🎉 syncWagonList completed successfully');
			return true;
		} catch (err) {
			console.error('❌ Failed to sync wagon list:', err);
			console.warn('Failed to sync wagon list:', err);
			return false;
		}
	},

	// Update syncAllPending to include train dispatches
	async syncAllPending() {
		await Promise.all([
			this.syncPendingAssays(),
			this.syncPendingWagons(),
			this.syncPendingTruckLoads(),
			this.syncConsignmentList(),
			this.syncPendingTrainDispatches(),
			this.syncDeletedRecords('assays'),
			this.syncDeletedRecords('wagons'),
			this.syncDeletedRecords('truckLoads'),
			this.syncDeletedRecords('trainDispatches'),
			this.syncPendingShuntingTrains()
		]);

	}
};


	
