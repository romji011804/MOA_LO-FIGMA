export interface RecordItem {
  id: string;
  controlNumber: string;
  school: string;
  course: string;
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
}

export const DEFAULT_RECORDS: RecordItem[] = [
  {
    id: "1",
    controlNumber: "MOA-2026-001",
    school: "University of the Philippines",
    course: "Bachelor of Science in Computer Science",
    status: "Ongoing",
    workflow: "For Review",
  },
  {
    id: "2",
    controlNumber: "MOA-2026-002",
    school: "Ateneo de Manila University",
    course: "Bachelor of Arts in Communication",
    status: "Completed",
    workflow: "Approved",
  },
  {
    id: "3",
    controlNumber: "MOA-2026-003",
    school: "De La Salle University",
    course: "Bachelor of Science in Business Administration",
    status: "Ongoing",
    workflow: "Missing Legal Opinion",
  },
  {
    id: "4",
    controlNumber: "MOA-2026-004",
    school: "University of Santo Tomas",
    course: "Bachelor of Science in Nursing",
    status: "Ongoing",
    workflow: "Missing MOA",
  },
  {
    id: "5",
    controlNumber: "MOA-2026-005",
    school: "Polytechnic University of the Philippines",
    course: "Bachelor of Science in Information Technology",
    status: "Completed",
    workflow: "Approved",
  },
  {
    id: "6",
    controlNumber: "MOA-2026-006",
    school: "Mapúa University",
    course: "Bachelor of Science in Civil Engineering",
    status: "Ongoing",
    workflow: "For Review",
  },
];

const STORAGE_KEY = "moa-lo-records";

export function loadRecords(): RecordItem[] {
  if (typeof window === "undefined") {
    return DEFAULT_RECORDS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_RECORDS;
    }
    const parsed = JSON.parse(raw) as RecordItem[];
    return Array.isArray(parsed) ? parsed : DEFAULT_RECORDS;
  } catch {
    return DEFAULT_RECORDS;
  }
}

export function saveRecords(records: RecordItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

