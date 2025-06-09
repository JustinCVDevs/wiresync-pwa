export interface Step { name: string; path: string }
export const processConfig: Record<string, Step[]> = {
    east_loadout: [
        { name: 'Train Details', path: '' },
        { name: 'Wagon Capturing', path: 'wagon-details' },
        { name: 'Verification', path: 'verification' },
        { name: 'Review', path: 'review' }
    ],
    gravelotte: [
        { name: 'Data Capturing', path: '' },
        { name: 'Add Trucks', path: 'add-trucks' }
    ],
    west_loadout: [
        { name: 'Train Details', path: '' },
        { name: 'Sample Details Verif.', path: 'verification' },
        { name: 'FEL Weight', path: 'fel-weight' },
        { name: 'Wagon Review', path: 'review' }
    ],
    // …other forms…
};
