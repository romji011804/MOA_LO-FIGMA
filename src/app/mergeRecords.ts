import { RecordItem, loadRecords, saveRecords } from "./records";

export interface MergeResult {
  imported: number;
  duplicates: number;
  idsRegenerated: number;
  controlNumbersAdjusted: number;
  errors: string[];
}

function normalizeMachineId(id: string): string {
  return id.trim().replace(/\s+/g, "").toUpperCase().substring(0, 50);
}

export function getMachineId(): string {
  let machineId = localStorage.getItem("machine-id");
  if (!machineId) {
    machineId = Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem("machine-id", machineId);
  }
  return normalizeMachineId(machineId);
}

export function setMachineId(newId: string): boolean {
  const normalized = normalizeMachineId(newId);
  if (normalized.length < 2) return false;
  localStorage.setItem("machine-id", normalized);
  return true;
}

export function isFromThisMachine(controlNumber: string): boolean {
  const machineId = getMachineId();
  const escapedId = machineId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^\\d+-\\d{4}-(${escapedId})-`);
  return regex.test(controlNumber);
}

export function generateRecordId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function counterKey(year: number): string {
  return `cn-seq-${year}`;
}

function readCounter(key: string): number {
  return parseInt(localStorage.getItem(key) ?? "0", 10) || 0;
}

function writeCounter(key: string, value: number): void {
  localStorage.setItem(key, String(value));
}

function getLowestAvailableSequence(usedSequences: Set<number>) {
  let candidate = 1;
  while (usedSequences.has(candidate)) {
    candidate += 1;
  }
  return candidate;
}

function parseControlNumber(controlNumber: string) {
  const currentFormat = controlNumber.match(/^(\d+)-(\d{4})-([^-]+)-(.+)$/);
  if (currentFormat) {
    return {
      sequence: parseInt(currentFormat[1], 10),
      year: parseInt(currentFormat[2], 10),
      machineId: normalizeMachineId(currentFormat[3]),
      recordId: currentFormat[4],
    };
  }

  const legacyFormat = controlNumber.match(/^MOA-(\d{4})-([^-]+)-(\d+)$/i);
  if (legacyFormat) {
    return {
      sequence: parseInt(legacyFormat[3], 10),
      year: parseInt(legacyFormat[1], 10),
      machineId: normalizeMachineId(legacyFormat[2]),
      recordId: "legacy",
    };
  }

  return null;
}

function generateControlNumberForScope(
  records: RecordItem[],
  recordId: string,
  year: number,
  machineId: string
): string {
  const key = counterKey(year);
  const usedSequences = new Set<number>();
  const maxFromRecords = records.reduce((max, record) => {
    const parsed = parseControlNumber(record.controlNumber);
    if (!parsed || parsed.year !== year) {
      return max;
    }
    usedSequences.add(parsed.sequence);
    return Math.max(max, parsed.sequence);
  }, 0);

  const next = getLowestAvailableSequence(usedSequences);
  writeCounter(key, Math.max(readCounter(key), maxFromRecords, next));

  return `${String(next).padStart(3, "0")}-${year}-${machineId}-${recordId}`;
}

export function generateControlNumber(records: RecordItem[], recordId: string): string {
  const machineId = getMachineId();
  const year = new Date().getFullYear();
  return generateControlNumberForScope(records, recordId, year, machineId);
}

export function syncSequenceCounters(importedRecords: RecordItem[]): void {
  for (const record of importedRecords) {
    const parsed = parseControlNumber(record.controlNumber);
    if (!parsed) continue;
    const key = counterKey(parsed.year);
    const seq = parsed.sequence;
    if (seq > readCounter(key)) {
      writeCounter(key, seq);
    }
  }
}

export function mergeRecords(importedRecords: RecordItem[]): MergeResult {
  const existingRecords = loadRecords();
  const result: MergeResult = {
    imported: 0,
    duplicates: 0,
    idsRegenerated: 0,
    controlNumbersAdjusted: 0,
    errors: [],
  };

  const existingIdSet = new Set(existingRecords.map((r) => r.id));
  const existingCnSet = new Set(existingRecords.map((r) => r.controlNumber));
  const running: RecordItem[] = [...existingRecords];
  const recordsToAdd: RecordItem[] = [];

  for (const raw of importedRecords) {
    try {
      if (!raw.controlNumber) {
        result.errors.push(`Skipped: missing control number (id=${raw.id ?? "?"})`);
        continue;
      }

      let record: RecordItem = { ...raw };
      const importedScope = parseControlNumber(record.controlNumber);

      const hasValidId = typeof record.id === "string" && record.id.trim() !== "";
      if (!hasValidId || existingIdSet.has(record.id)) {
        const originalId = record.id;
        let newId = generateRecordId();
        while (existingIdSet.has(newId)) {
          newId = generateRecordId();
        }

        const newCn = importedScope
          ? generateControlNumberForScope(
              running,
              newId,
              importedScope.year,
              importedScope.machineId
            )
          : generateControlNumber(running, newId);

        result.idsRegenerated += 1;
        result.controlNumbersAdjusted += 1;
        result.errors.push(
          `ID conflict: "${originalId}" -> "${newId}" | CN: "${record.controlNumber}" -> "${newCn}"`
        );
        record = { ...record, id: newId, controlNumber: newCn };
      }
      existingIdSet.add(record.id);

      if (existingCnSet.has(record.controlNumber)) {
        const originalCn = record.controlNumber;
        const currentScope = parseControlNumber(record.controlNumber);
        const newCn = currentScope
          ? generateControlNumberForScope(
              running,
              record.id,
              currentScope.year,
              currentScope.machineId
            )
          : generateControlNumber(running, record.id);

        result.controlNumbersAdjusted += 1;
        result.errors.push(
          `CN conflict: "${originalCn}" -> "${newCn}" (id: ${record.id})`
        );
        record = { ...record, controlNumber: newCn };
      }

      existingCnSet.add(record.controlNumber);
      recordsToAdd.push(record);
      running.push(record);
      result.imported += 1;
    } catch (error) {
      result.errors.push(`Error processing record (id=${raw.id ?? "?"}): ${error}`);
    }
  }

  if (recordsToAdd.length > 0) {
    saveRecords([...existingRecords, ...recordsToAdd]);
    syncSequenceCounters(recordsToAdd);
  }

  return result;
}

export function exportRecordsToJSON(): string {
  return JSON.stringify(loadRecords(), null, 2);
}

export function importRecordsFromJSON(jsonString: string): MergeResult {
  try {
    const importedRecords = JSON.parse(jsonString) as RecordItem[];
    if (!Array.isArray(importedRecords)) {
      return {
        imported: 0,
        duplicates: 0,
        idsRegenerated: 0,
        controlNumbersAdjusted: 0,
        errors: ["Invalid JSON format: expected an array of records"],
      };
    }
    return mergeRecords(importedRecords);
  } catch (error) {
    return {
      imported: 0,
      duplicates: 0,
      idsRegenerated: 0,
      controlNumbersAdjusted: 0,
      errors: [`Failed to parse JSON: ${error}`],
    };
  }
}
