import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import type { RecordItem } from './records';

export interface CloudRecord {
  firestoreId: string;
  controlNumber: string;
  school: string;
  course: string;
  status: string;
  workflow: string;
  hours?: string;
  dateReceived?: string;
  moaFileName?: string;
  moaType?: string;
  legalOpinionFileName?: string;
  legalOpinionType?: string;
  uploadedAt: string;
}

export { isFirebaseConfigured };

export async function loadCloudRecords(): Promise<CloudRecord[]> {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured.');

  const q = query(collection(db, 'records'), orderBy('uploadedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    firestoreId: d.id,
    ...(d.data() as Omit<CloudRecord, 'firestoreId'>),
  }));
}

export async function pushRecordToCloud(record: RecordItem): Promise<string> {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured.');

  const payload = {
    controlNumber: record.controlNumber,
    school: record.school,
    course: record.course,
    status: record.status,
    workflow: record.workflow,
    hours: record.hours || null,
    dateReceived: record.dateReceived || null,
    moaFileName: record.moaFileName || null,
    moaType: record.moaType || null,
    legalOpinionFileName: record.legalOpinionFileName || null,
    legalOpinionType: record.legalOpinionType || null,
    uploadedAt: new Date().toISOString(),
    localId: record.id,
  };

  const ref = await addDoc(collection(db, 'records'), payload);
  return ref.id;
}

export async function deleteCloudRecord(firestoreId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(db, 'records', firestoreId));
}
