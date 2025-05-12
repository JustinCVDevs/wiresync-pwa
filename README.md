# PMC Offline Application

## Overview

The PMC Offline Application is a robust tool designed to streamline and digitize operational processes for the Palabora Mining Company (PMC) and associated locations. It enables efficient data capture, validation, and linking of components such as wagons, trucks, consignments, and samples. The application operates offline, ensuring uninterrupted functionality in remote areas, with data synchronization to the central database (WIRE) when connectivity is restored.

## Purpose

- **Enhance Operational Efficiency**
  Automate data entry and validation processes, reducing manual errors and improving accuracy.
- **Enable Offline Functionality**
  Allow users to perform tasks in areas with limited connectivity.
- **Standardize Processes**
  Provide a consistent interface for managing operations across multiple locations.
- **Improve Data Management**
  Facilitate the creation, linking, and storage of transactions for components like wagons, trucks, consignments, and samples.
- **Support Decision-Making**
  Deliver accurate and up-to-date data for operational analysis and reporting.

## Features

1. **User Login and Navigation**

   - Secure login with username and password
   - Location-based process selection (PMC, Bosveld, Richards Bay)

2. **Process-Specific Interfaces**

   - Marshaling Receival
   - Marshaling Dispatch
   - West Loadout
   - East Loadout
   - Gravelotte & Truck Loadout
   - Copper Truck Loadout
   - Acid Truck

3. **Data Capture and Validation**

   - RFID scanning, manual data entry, dropdown selections
   - Camera integration for photographs
   - Real-time validation and linking of components

4. **Transaction Creation**

   - Automatic creation of transactions in WIRE for wagons, trucks, consignments, samples

5. **Relationships and Linking**

   - Link multiple wagons to trains and consignments
   - Reuse RFID tags across wagons and trucks

6. **Offline Functionality**

   - Seamless operation in offline mode, with background sync when online

## Processes

### 1. General Login and Navigation

- **Inputs:** Username, Password, Location
- **Result:** Directs user to “Select a Location” or shows login error

### 2. PMC Marshaling Receival

- **Inputs:** RFID Tag, Wagon ID, Photograph of Wagon
- **Result:** Creates a WAGON transaction in WIRE

### 3. PMC Marshaling Dispatch

- **Inputs:**

  - Train Reference Number
  - Consignment Number
  - Train RFID Number
  - Wagon RFID Tag
  - Wagon ID
  - Photograph of Train RFID

- **Result:**

  - Links wagons to TRAIN & CONSIGNMENT
  - Allocates timestamp
  - Links CONSIGNMENT to TRAIN

### 4. West Loadout

- **Inputs:**
  Sample ID, Product Grade, Consignment Number, Loading Location, Wagon ID, Wagon Weight, Wagon Sampling Status
- **Result:**
  Creates an ASSAY transaction and links wagons to the Sample ID

### 5. East Loadout

- **Inputs:** Sample ID, Product Grade, Wagon ID, Wagon Sampling Status
- **Result:** Creates an ASSAY transaction and links wagons to the Sample ID

### 6. Gravelotte & Truck Loadout

- **Dedicated Fleet: NO**

  - **Inputs:** Sample ID, Sample Size, Commodity, Product Type, Truck Registration, FEL Weight, Sample Status, Loading Location
  - **Result:** ASSAY transaction; links trucks to Sample ID

- **Dedicated Fleet: YES**

  - **Inputs:** Sample ID, Sample Size, Commodity, Product Type, Truck Registration, FEL Weight, Sample Status, Loading Location, Loading Hour
  - **Result:** FLEET transaction; links trucks to Sample ID

### 7. Copper Truck Loadout

- **Inputs:** Truck Registration, Photograph of Truck, Material Type, Loaded Weight, Sample ID
- **Result:** ASSAY transaction; links Sample ID to truck

### 8. Acid Truck

- **Inputs:** Truck Registration, Photograph of Truck, Tank Loaded From, Acid Type, Sample ID
- **Result:** ASSAY transaction; links Sample ID to truck

## Relationships and Linking

- Multiple wagons → one train & one consignment
- Multiple consignments → one train
- Batch assignment of Sample ID, Product Grade, Consignment Number & Loading Location upon “Complete Loading”
- RFID tags reused across wagons and trucks

## Installation

```bash
# Clone the repository
git clone <REPO_URL>

# Install dependencies
npm install

# Run the application
npm run start
```

_(Replace `<REPO_URL>` with the actual repository URL.)_

## Usage

1. **Login:** Enter your username & password
2. **Select Location:** PMC, Bosveld, or Richards Bay
3. **Select Process:** Choose from Marshaling Receival, West Loadout, etc.
4. **Enter Data:** RFID tags, IDs, weights, sample details
5. **Submit:** Transactions are created and components linked
6. **Complete Loading:** Finalize the workflow and return to home

## Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Make changes & commit: `git commit -m "Add feature"`
4. Push branch: `git push origin feature/your-feature`
5. Submit a Pull Request

## License

This project is proprietary and contains confidential information belonging to Metal Management Solutions (MMS). Redistribution or modification is prohibited without prior written permission.

## Contact

- **Project Lead:** Philip Mare – [philip.mare@metalmanagementsolutions.com](mailto:philip.mare@metalmanagementsolutions.com)
- **Project Manager:** Rouxne Prinsloo – [rouxne@metalmanagementsolutions.com](mailto:rouxne@metalmanagementsolutions.com)

## Acknowledgments

Special thanks to the development team and stakeholders for their contributions.
