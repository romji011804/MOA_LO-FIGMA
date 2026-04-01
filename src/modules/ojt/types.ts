export type OjtRecordStatus = "complete" | "missing";

export interface OjtRecord {
  id: string;
  date: string;
  createdAt: string;
  studentName: string;
  company: string;
  school: string;
  program?: string;
  status: OjtRecordStatus;
  certificateFile?: string;
  certificateFileName?: string;
  notes?: string;
}

export interface OjtQrRecord {
  id: string;
  date: string;
  createdAt: string;
  program: string;
  school: string;
  year: number;
  fileUrl: string;
  qrImageFile?: string;
  qrImageFileName?: string;
}
