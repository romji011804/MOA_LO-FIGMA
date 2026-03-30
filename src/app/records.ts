export interface RecordItem {
  id: string;
  controlNumber: string;
  school: string;
  course: string;
  year?: number;
  status: "Ongoing" | "Completed";
  workflow: string;
  hours?: string;
  dateReceived?: string;
  moaValue?: string;
  moaFileName?: string;
  moaType?: "file" | "link";
  legalOpinionValue?: string;
  legalOpinionFileName?: string;
  legalOpinionType?: "file" | "link";
  createdAt?: string;
  updatedAt?: string;
}

export interface RecordFilters {
  school?: string;
  course?: string;
  year?: number;
  status?: RecordItem["status"];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface RecordFilterOptions {
  schools: string[];
  coursesBySchool: Record<string, string[]>;
  years: number[];
  statuses: RecordItem["status"][];
}

export interface RecordDocumentStats {
  missingLegalOpinion: number;
  missingMoa: number;
  completeRecords: number;
}

interface RecordIndex {
  school: Map<string, RecordItem[]>;
  course: Map<string, RecordItem[]>;
  year: Map<number, RecordItem[]>;
}

const STORAGE_KEY = "moa-lo-records";
export const RECORDS_UPDATED_EVENT = "moa-lo-records-updated";

export const DEFAULT_RECORDS: RecordItem[] = [
  {
    id: "1",
    controlNumber: "001-2026-MAIN-a1b2c3d",
    school: "PSU Lingayen",
    course: "BS Computer Science",
    year: 2026,
    status: "Ongoing",
    workflow: "For Review",
    createdAt: "2026-01-15T09:30:00.000Z",
    updatedAt: "2026-01-15T09:30:00.000Z",
  },
  {
    id: "2",
    controlNumber: "002-2026-MAIN-b2c3d4e",
    school: "PSU Binmaley",
    course: "BS Education",
    year: 2026,
    status: "Completed",
    workflow: "Approved",
    createdAt: "2026-02-03T11:20:00.000Z",
    updatedAt: "2026-02-10T08:10:00.000Z",
  },
  {
    id: "3",
    controlNumber: "003-2025-MAIN-c3d4e5f",
    school: "PSU Urdaneta",
    course: "BS Engineering",
    year: 2025,
    status: "Ongoing",
    workflow: "Missing Legal Opinion",
    createdAt: "2025-11-28T07:45:00.000Z",
    updatedAt: "2025-12-01T13:15:00.000Z",
  },
  {
    id: "4",
    controlNumber: "004-2024-MAIN-d4e5f6g",
    school: "PSU Lingayen",
    course: "BS Education",
    year: 2024,
    status: "Ongoing",
    workflow: "Missing MOA",
    createdAt: "2024-09-12T10:00:00.000Z",
    updatedAt: "2024-09-12T10:00:00.000Z",
  },
  {
    id: "5",
    controlNumber: "005-2025-MAIN-e5f6g7h",
    school: "PSU Binmaley",
    course: "BS Computer Science",
    year: 2025,
    status: "Completed",
    workflow: "Approved",
    createdAt: "2025-06-18T14:05:00.000Z",
    updatedAt: "2025-07-01T09:40:00.000Z",
  },
  {
    id: "6",
    controlNumber: "006-2026-MAIN-f6g7h8i",
    school: "PSU Urdaneta",
    course: "BS Engineering",
    year: 2026,
    status: "Ongoing",
    workflow: "For Review",
    createdAt: "2026-03-08T15:25:00.000Z",
    updatedAt: "2026-03-12T16:55:00.000Z",
  },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function extractYearFromControlNumber(controlNumber: string) {
  const match = controlNumber.match(/(?:^|[-/])(\d{4})(?:[-/]|$)/);
  return match ? Number(match[1]) : undefined;
}

export function getRecordYear(record: RecordItem) {
  if (typeof record.year === "number" && Number.isFinite(record.year)) {
    return record.year;
  }

  if (record.createdAt) {
    const createdYear = new Date(record.createdAt).getFullYear();
    if (Number.isFinite(createdYear)) {
      return createdYear;
    }
  }

  return extractYearFromControlNumber(record.controlNumber);
}

function ensureRecordShape(record: RecordItem): RecordItem {
  const normalizedYear = getRecordYear(record);
  return normalizedYear && record.year !== normalizedYear
    ? { ...record, year: normalizedYear }
    : record;
}

function buildRecordIndex(records: RecordItem[]): RecordIndex {
  const index: RecordIndex = {
    school: new Map(),
    course: new Map(),
    year: new Map(),
  };

  for (const record of records) {
    const schoolKey = normalizeText(record.school);
    const courseKey = normalizeText(record.course);
    const year = getRecordYear(record);

    if (!index.school.has(schoolKey)) {
      index.school.set(schoolKey, []);
    }
    index.school.get(schoolKey)?.push(record);

    if (!index.course.has(courseKey)) {
      index.course.set(courseKey, []);
    }
    index.course.get(courseKey)?.push(record);

    if (typeof year === "number") {
      if (!index.year.has(year)) {
        index.year.set(year, []);
      }
      index.year.get(year)?.push(record);
    }
  }

  return index;
}

function intersectRecordSets(current: RecordItem[] | null, next: RecordItem[]) {
  if (!current) {
    return next;
  }

  const allowedIds = new Set(next.map((record) => record.id));
  return current.filter((record) => allowedIds.has(record.id));
}

function matchesDateRange(record: RecordItem, dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) {
    return true;
  }

  const referenceDate = record.createdAt || record.updatedAt || record.dateReceived;
  if (!referenceDate) {
    return false;
  }

  const createdTime = new Date(referenceDate).getTime();
  if (Number.isNaN(createdTime)) {
    return false;
  }

  const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : undefined;
  const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : undefined;

  if (typeof fromTime === "number" && createdTime < fromTime) {
    return false;
  }

  if (typeof toTime === "number" && createdTime > toTime) {
    return false;
  }

  return true;
}

function matchesSearch(record: RecordItem, search?: string) {
  if (!search?.trim()) {
    return true;
  }

  const query = normalizeText(search);
  const searchableFields = [
    record.controlNumber,
    record.school,
    record.course,
    record.status,
    record.workflow,
    record.moaFileName,
    record.legalOpinionFileName,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return searchableFields.some((value) => value.includes(query));
}

export function loadRecords(): RecordItem[] {
  if (typeof window === "undefined") {
    return DEFAULT_RECORDS.map(ensureRecordShape);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_RECORDS.map(ensureRecordShape);
    }

    const parsed = JSON.parse(raw) as RecordItem[];
    return Array.isArray(parsed)
      ? parsed.map(ensureRecordShape)
      : DEFAULT_RECORDS.map(ensureRecordShape);
  } catch {
    return DEFAULT_RECORDS.map(ensureRecordShape);
  }
}

export function saveRecords(records: RecordItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedRecords = records.map(ensureRecordShape);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedRecords));
  window.dispatchEvent(new CustomEvent(RECORDS_UPDATED_EVENT, { detail: normalizedRecords }));
}

function hasDocumentReference(value?: string | null) {
  return typeof value === "string" && value.trim() !== "";
}

export function hasLegalOpinion(record: RecordItem) {
  return hasDocumentReference(record.legalOpinionValue);
}

export function hasMoa(record: RecordItem) {
  return hasDocumentReference(record.moaValue);
}

export function getRecordDocumentStats(records: RecordItem[]): RecordDocumentStats {
  let missingLegalOpinion = 0;
  let missingMoa = 0;
  let completeRecords = 0;

  for (const record of records) {
    const hasLo = hasLegalOpinion(record);
    const hasMoaDocument = hasMoa(record);

    if (!hasLo) {
      missingLegalOpinion += 1;
    }

    if (!hasMoaDocument) {
      missingMoa += 1;
    }

    if (hasLo && hasMoaDocument) {
      completeRecords += 1;
    }
  }

  return {
    missingLegalOpinion,
    missingMoa,
    completeRecords,
  };
}

export function getRecordFilterOptions(records: RecordItem[]): RecordFilterOptions {
  const normalizedRecords = records.map(ensureRecordShape);
  const schoolEntries = new Map<string, string>();
  const yearEntries = new Set<number>();
  const statusEntries = new Set<RecordItem["status"]>();
  const coursesBySchool = new Map<string, Map<string, string>>();

  for (const record of normalizedRecords) {
    const schoolKey = normalizeText(record.school);
    const courseKey = normalizeText(record.course);
    const year = getRecordYear(record);

    if (!schoolEntries.has(schoolKey)) {
      schoolEntries.set(schoolKey, record.school);
    }

    if (!coursesBySchool.has(schoolKey)) {
      coursesBySchool.set(schoolKey, new Map());
    }

    if (!coursesBySchool.get(schoolKey)?.has(courseKey)) {
      coursesBySchool.get(schoolKey)?.set(courseKey, record.course);
    }

    if (typeof year === "number") {
      yearEntries.add(year);
    }

    statusEntries.add(record.status);
  }

  return {
    schools: [...schoolEntries.values()].sort((a, b) => a.localeCompare(b)),
    coursesBySchool: Object.fromEntries(
      [...coursesBySchool.entries()].map(([schoolKey, courseMap]) => [
        schoolKey,
        [...courseMap.values()].sort((a, b) => a.localeCompare(b)),
      ])
    ),
    years: [...yearEntries].sort((a, b) => b - a),
    statuses: [...statusEntries].sort((a, b) => a.localeCompare(b)),
  };
}

export function filterRecords(records: RecordItem[], filters: RecordFilters) {
  const normalizedRecords = records.map(ensureRecordShape);
  const index = buildRecordIndex(normalizedRecords);
  let results: RecordItem[] | null = null;

  if (filters.school) {
    results = intersectRecordSets(results, index.school.get(normalizeText(filters.school)) ?? []);
  }

  if (filters.course) {
    results = intersectRecordSets(results, index.course.get(normalizeText(filters.course)) ?? []);
  }

  if (typeof filters.year === "number") {
    results = intersectRecordSets(results, index.year.get(filters.year) ?? []);
  }

  const narrowed = results ?? normalizedRecords;

  return narrowed.filter((record) => {
    if (filters.status && record.status !== filters.status) {
      return false;
    }

    if (!matchesDateRange(record, filters.dateFrom, filters.dateTo)) {
      return false;
    }

    if (!matchesSearch(record, filters.search)) {
      return false;
    }

    return true;
  });
}
