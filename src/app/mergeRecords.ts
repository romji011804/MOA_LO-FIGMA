import { RecordItem, loadRecords, saveRecords } from "./records";

export interface MergeResult {
  imported: number;
  duplicates: number;
  errors: string[];
}

/**
 * Merge records from another source (e.g., exported JSON file from another PC)
 * Handles duplicate detection and resolution
 */
export function mergeRecords(importedRecords: RecordItem[]): MergeResult {
  const existingRecords = loadRecords();
  const result: MergeResult = {
    imported: 0,
    duplicates: 0,
    errors: [],
  };

  // Create a map of existing records by control number for quick lookup
  const existingMap = new Map<string, RecordItem>();
  existingRecords.forEach((record) => {
    existingMap.set(record.controlNumber, record);
  });

  const recordsToAdd: RecordItem[] = [];

  importedRecords.forEach((importedRecord) => {
    try {
      // Check if control number already exists
      if (existingMap.has(importedRecord.controlNumber)) {
        result.duplicates++;
        
        // Optional: You could implement merge strategies here
        // For now, we skip duplicates
        result.errors.push(
          `Duplicate: ${importedRecord.controlNumber} already exists`
        );
      } else {
        // New record, add it
        recordsToAdd.push(importedRecord);
        result.imported++;
      }
    } catch (error) {
      result.errors.push(
        `Error processing ${importedRecord.controlNumber}: ${error}`
      );
    }
  });

  // Save merged records
  if (recordsToAdd.length > 0) {
    const mergedRecords = [...existingRecords, ...recordsToAdd];
    saveRecords(mergedRecords);
  }

  return result;
}

/**
 * Export records to JSON for sharing with other PCs
 */
export function exportRecordsToJSON(): string {
  const records = loadRecords();
  return JSON.stringify(records, null, 2);
}

/**
 * Import records from JSON string
 */
export function importRecordsFromJSON(jsonString: string): MergeResult {
  try {
    const importedRecords = JSON.parse(jsonString) as RecordItem[];
    
    if (!Array.isArray(importedRecords)) {
      return {
        imported: 0,
        duplicates: 0,
        errors: ["Invalid JSON format: expected an array of records"],
      };
    }

    return mergeRecords(importedRecords);
  } catch (error) {
    return {
      imported: 0,
      duplicates: 0,
      errors: [`Failed to parse JSON: ${error}`],
    };
  }
}

/**
 * Get machine ID for this PC
 */
export function getMachineId(): string {
  let machineId = localStorage.getItem('machine-id');
  if (!machineId) {
    // This shouldn't happen in normal use, but provide fallback
    machineId = Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem('machine-id', machineId);
  }
  return machineId;
}

/**
 * Check if a control number is from this machine
 */
export function isFromThisMachine(controlNumber: string): boolean {
  const machineId = getMachineId();
  const match = controlNumber.match(/MOA-\d{4}-([A-Z0-9]+)-\d+/);
  return match ? match[1] === machineId : false;
}

/**
 * Change the machine ID (useful for renaming)
 */
export function setMachineId(newId: string): boolean {
  // Validate input
  const cleanId = newId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);
  
  if (cleanId.length < 2) {
    return false;
  }
  
  localStorage.setItem('machine-id', cleanId);
  return true;
}
