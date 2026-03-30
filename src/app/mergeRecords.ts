import { RecordItem, loadRecords, saveRecords } from "./records";

export interface MergeResult {
  imported: number;
  duplicates: number;
  idsRegenerated: number;
  controlNumbersAdjusted: number;
  errors: string[];
}

// ─── Machine ID ───────────────────────────────────────────────────────────────

/**
 * Normalize a machine ID: trim, remove spaces, UPPERCASE.
 * "Main Office" → "MAINOFFICE", "testpc" → "TESTPC"
 */
function normalizeMachineId(id: string): string {
  return id.trim().replace(/\s+/g, "").toUpperCase().substring(0, 50);
}

/** Get (or create) the persistent machine ID for this device. */
export function getMachineId(): string {
  let machineId = localStorage.getItem("machine-id");
  if (!machineId) {
    machineId = Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem("machine-id", machineId);
  }
  // Always return normalized form
  return normalizeMachineId(machineId);
}

/** Update the machine ID (validates + normalizes before storing). */
export function setMachineId(newId: string): boolean {
  const normalized = normalizeMachineId(newId);
  if (normalized.length < 2) return false;
  localStorage.setItem("machine-id", normalized);
  return true;
}

/** Check if a control number was generated on this machine. */
export function isFromThisMachine(controlNumber: string): boolean {
  const machineId = getMachineId();
  const escapedId = machineId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // New format: {seq}-{year}-{machineId}-{recordId}
  const regex = new RegExp(`^\\d+-\\d{4}-(${escapedId})-`);
  return regex.test(controlNumber);
}

// ─── Record ID ────────────────────────────────────────────────────────────────

/**
 * Generate a short, unique record ID (7 lowercase alphanumeric chars).
 * Example: "a8f3x92"
 * This becomes the last component of the Control Number.
 */
export function generateRecordId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ─── Persistent sequence counter ─────────────────────────────────────────────

function counterKey(year: number, machineId: string): string {
  return `cn-seq-${year}-${machineId}`;
}

function readCounter(key: string): number {
  return parseInt(localStorage.getItem(key) ?? "0", 10) || 0;
}

function writeCounter(key: string, value: number): void {
  localStorage.setItem(key, String(value));
}

// ─── Control Number generation ────────────────────────────────────────────────

/**
 * Generate a stable, monotonic control number in format:
 *   {SEQ}-{YEAR}-{MACHINEID}-{RECORDID}
 *   e.g. 001-2026-TESTPC-a8f3x92
 *
 * Rules:
 * - SEQ is year-scoped and monotonic (never reused even after record deletion).
 * - Counter is persisted in localStorage so deletions cannot reset it.
 * - On first call (or after localStorage clearance), counter is seeded from
 *   the highest sequence found in existing records.
 * - recordId is embedded in the CN so it is permanently linked.
 */
export function generateControlNumber(records: RecordItem[], recordId: string): string {
  const machineId = getMachineId();
  const year = new Date().getFullYear();
  const key = counterKey(year, machineId);

  // Seed from existing records in case localStorage counter was cleared.
  // Match new format: {seq}-{year}-{machineId}-{recordId}
  const escapedId = machineId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^(\\d+)-${year}-(${escapedId})-`);
  const maxFromRecords = records.reduce((max, record) => {
    const match = record.controlNumber.match(regex);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  const base = Math.max(readCounter(key), maxFromRecords);
  const next = base + 1;
  writeCounter(key, next);

  return `${String(next).padStart(3, "0")}-${year}-${machineId}-${recordId}`;
}

/**
 * After importing records, bump every relevant counter so this machine's
 * next sequence always stays above any imported sequence.
 */
export function syncSequenceCounters(importedRecords: RecordItem[]): void {
  // Matches both old format (MOA-YEAR-ID-SEQ) and new format (SEQ-YEAR-ID-RECORDID)
  const newFmt = /^(\d+)-(\d{4})-([^-]+)-/;
  for (const record of importedRecords) {
    const match = record.controlNumber.match(newFmt);
    if (!match) continue;
    const [, seqStr, yearStr, machId] = match;
    const seq = parseInt(seqStr, 10);
    const key = counterKey(parseInt(yearStr, 10), machId);
    if (seq > readCounter(key)) {
      writeCounter(key, seq);
    }
  }
}

// ─── Merge / Export / Import ──────────────────────────────────────────────────

/**
 * Merge records from another source.
 *
 * Safety guarantees:
 * - Duplicate Record IDs → new ID + new CN generated (CN embeds the ID).
 * - Duplicate Control Numbers (same-machine duplicate) → new CN generated.
 * - Existing records are NEVER silently overwritten.
 * - In-batch duplicates (two imported records sharing an ID/CN) are caught.
 */
export function mergeRecords(importedRecords: RecordItem[]): MergeResult {
  const existingRecords = loadRecords();
  const result: MergeResult = {
    imported: 0,
    duplicates: 0,
    idsRegenerated: 0,
    controlNumbersAdjusted: 0,
    errors: [],
  };

  // Live sets — grow as records are accepted so in-batch duplicates are caught.
  const existingIdSet = new Set(existingRecords.map((r) => r.id));
  const existingCnSet = new Set(existingRecords.map((r) => r.controlNumber));

  // Running list used by generateControlNumber for accurate sequence seeding.
  const running: RecordItem[] = [...existingRecords];
  const recordsToAdd: RecordItem[] = [];

  for (const raw of importedRecords) {
    try {
      if (!raw.controlNumber) {
        result.errors.push(`Skipped: missing control number (id=${raw.id ?? "?"})`);
        continue;
      }

      let record: RecordItem = { ...raw };

      // ── 1. Enforce unique Record ID ──────────────────────────────────────
      const hasValidId = typeof record.id === "string" && record.id.trim() !== "";
      if (!hasValidId || existingIdSet.has(record.id)) {
        const originalId = record.id;
        // ID conflict → also need a new CN (CN embeds the record ID)
        const newRecordId = generateRecordId();
        let newId = newRecordId;
        while (existingIdSet.has(newId)) {
          newId = generateRecordId();
        }
        const newCn = generateControlNumber(running, newId);
        result.idsRegenerated++;
        result.controlNumbersAdjusted++;
        result.errors.push(
          `ID conflict: "${originalId}" → "${newId}" | CN: "${record.controlNumber}" → "${newCn}"`
        );
        record = { ...record, id: newId, controlNumber: newCn };
      }
      existingIdSet.add(record.id);

      // ── 2. ALWAYS assign a fresh sequential CN ───────────────────────────
      //    Never trust the imported CN. Unconditionally generate the next
      //    sequential value so the system is a collision-safe ID generator.
      {
        const originalCn = record.controlNumber;
        const newCn = generateControlNumber(running, record.id);
        result.controlNumbersAdjusted++;
        result.errors.push(
          `CN reassigned: "${originalCn}" → "${newCn}" (id: ${record.id})`
        );
        record = { ...record, controlNumber: newCn };
      }
      existingCnSet.add(record.controlNumber);

      // ── 3. Accept ─────────────────────────────────────────────────────────
      recordsToAdd.push(record);
      running.push(record);
      result.imported++;
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

/** Export records to JSON for sharing with other PCs. */
export function exportRecordsToJSON(): string {
  return JSON.stringify(loadRecords(), null, 2);
}

/** Import records from a JSON string. */
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
