const API_BASE = 'http://localhost:3001/api';

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
  is_synced?: boolean;
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

export async function loadRecords(): Promise<RecordItem[]> {
  try {
    const response = await fetch(`${API_BASE}/records`);
    if (!response.ok) {
      throw new Error('Failed to fetch records');
    }
    const records = await response.json();
    return records.length > 0 ? records : DEFAULT_RECORDS;
  } catch (error) {
    console.error('Error loading records from API, using defaults:', error);
    return DEFAULT_RECORDS;
  }
}

export async function saveRecords(records: RecordItem[]): Promise<void> {
  // This function is now handled by individual record operations
  // Keeping for backward compatibility
  console.log('saveRecords called - use individual record operations instead');
}

export async function createRecord(record: Omit<RecordItem, 'id'>): Promise<RecordItem> {
  const response = await fetch(`${API_BASE}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    throw new Error('Failed to create record');
  }

  return response.json();
}

export async function updateRecord(id: string, record: Omit<RecordItem, 'id'>): Promise<RecordItem> {
  const response = await fetch(`${API_BASE}/records/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    throw new Error('Failed to update record');
  }

  return response.json();
}

export async function deleteRecord(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/records/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete record');
  }
}

