import { matchesSearchQuery } from "../../shared/services/searchService.ts";
import { loadJsonRecords, saveJsonRecords } from "../../shared/storage/storageService.ts";
import type { OjtQrRecord, OjtRecord } from "./types";

const OJT_RECORDS_KEY = "ojt-records";
const OJT_QR_RECORDS_KEY = "ojt-qr-records";
export const OJT_RECORDS_UPDATED_EVENT = "ojt-records-updated";

const DEFAULT_OJT_RECORDS: OjtRecord[] = [
  {
    id: "ojt-1",
    date: "2026-03-01",
    createdAt: "2026-03-01T09:00:00.000Z",
    studentName: "Amber Mikaela Infante",
    company: "Provincial Government - ENRO",
    school: "Pangasinan National High School",
    program: "STEM",
    status: "complete",
    notes: "Certificate generated",
  },
  {
    id: "ojt-2",
    date: "2026-03-02",
    createdAt: "2026-03-02T10:00:00.000Z",
    studentName: "Judyl Caramat",
    company: "Provincial Government - ENRO",
    school: "Pangasinan National High School",
    program: "STEM",
    status: "missing",
    notes: "Waiting for certificate upload",
  },
];

export function loadOjtRecords() {
  return loadJsonRecords<OjtRecord>(OJT_RECORDS_KEY, DEFAULT_OJT_RECORDS);
}

export function saveOjtRecords(records: OjtRecord[]) {
  saveJsonRecords(OJT_RECORDS_KEY, records);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OJT_RECORDS_UPDATED_EVENT, { detail: records }));
  }
}

export function loadOjtQrRecords() {
  return loadJsonRecords<OjtQrRecord>(OJT_QR_RECORDS_KEY, []);
}

export function saveOjtQrRecords(records: OjtQrRecord[]) {
  saveJsonRecords(OJT_QR_RECORDS_KEY, records);
}

export function filterOjtRecords(records: OjtRecord[], search: string) {
  return records.filter((record) =>
    matchesSearchQuery(
      [record.studentName, record.company, record.school, record.program, record.status, record.notes],
      search,
    ),
  );
}

export function getOjtStats(records: OjtRecord[]) {
  return {
    totalCertificates: records.length,
    completeCertificates: records.filter((record) => record.status === "complete").length,
    missingCertificates: records.filter((record) => record.status === "missing").length,
  };
}
