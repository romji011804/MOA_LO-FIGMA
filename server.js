import express from 'express';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const firebaseStorage = getStorage(firebaseApp);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize SQLite database
let db;
let SQL;

async function initDatabase() {
  try {
    SQL = await initSqlJs();

    // Try to load existing database
    let filebuffer = null;
    try {
      filebuffer = fs.readFileSync(DB_PATH);
    } catch (err) {
      console.log('Creating new database file');
    }

    db = filebuffer ? new SQL.Database(filebuffer) : new SQL.Database();

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        control_number TEXT NOT NULL,
        school TEXT NOT NULL,
        course TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Ongoing', 'Completed')),
        workflow TEXT NOT NULL,
        hours TEXT,
        date_received TEXT,
        moa_value TEXT,
        moa_file_name TEXT,
        moa_type TEXT CHECK (moa_type IN ('file', 'link')),
        legal_opinion_value TEXT,
        legal_opinion_file_name TEXT,
        legal_opinion_type TEXT CHECK (legal_opinion_type IN ('file', 'link')),
        is_synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_data TEXT NOT NULL,
        mime_type TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Save database to file
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    console.log('SQLite database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Cloud sync functions
async function uploadFileToFirebase(base64Data, fileName, mimeType) {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Create a storage reference
    const storageRef = ref(firebaseStorage, `moa-lo-files/${Date.now()}_${fileName}`);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, buffer, {
      contentType: mimeType,
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading file to Firebase:', error);
    throw error;
  }
}

async function syncRecordToFirebase(record) {
  try {
    let moaUrl = record.moa_value;
    let legalOpinionUrl = record.legal_opinion_value;

    // Upload MOA file if it's a file (not a link)
    if (record.moa_type === 'file' && record.moa_value) {
      // Get file data from local database
      const fileStmt = db.prepare('SELECT file_data, mime_type FROM files WHERE id = ?');
      const fileResult = fileStmt.get(record.moa_value);

      if (fileResult) {
        moaUrl = await uploadFileToFirebase(fileResult.file_data, record.moa_file_name, fileResult.mime_type);
      }
    }

    // Upload Legal Opinion file if it's a file (not a link)
    if (record.legal_opinion_type === 'file' && record.legal_opinion_value) {
      // Get file data from local database
      const fileStmt = db.prepare('SELECT file_data, mime_type FROM files WHERE id = ?');
      const fileResult = fileStmt.get(record.legal_opinion_value);

      if (fileResult) {
        legalOpinionUrl = await uploadFileToFirebase(fileResult.file_data, record.legal_opinion_file_name, fileResult.mime_type);
      }
    }

    // Prepare record for Firestore
    const firestoreRecord = {
      id: record.id,
      control_number: record.control_number,
      school: record.school,
      course: record.course,
      status: record.status,
      workflow: record.workflow,
      hours: record.hours,
      date_received: record.date_received,
      moa_value: moaUrl,
      moa_file_name: record.moa_file_name,
      moa_type: record.moa_type,
      legal_opinion_value: legalOpinionUrl,
      legal_opinion_file_name: record.legal_opinion_file_name,
      legal_opinion_type: record.legal_opinion_type,
      created_at: record.created_at,
      updated_at: record.updated_at,
      synced_at: new Date().toISOString()
    };

    // Add to Firestore
    const docRef = await addDoc(collection(firestore, 'records'), firestoreRecord);

    // Mark as synced in local database
    const updateStmt = db.prepare('UPDATE records SET is_synced = 1 WHERE id = ?');
    updateStmt.run(record.id);

    // Save database changes
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    return { success: true, firestoreId: docRef.id };
  } catch (error) {
    console.error('Error syncing record to Firebase:', error);
    throw error;
  }
}

// Save database to file periodically
function saveDatabase() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }
}

// Save database every 30 seconds
setInterval(saveDatabase, 30000);

// API Routes

// Get all records
app.get('/api/records', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM records ORDER BY created_at DESC');
    const records = stmt.all();
    res.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Get single record
app.get('/api/records/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM records WHERE id = ?');
    const record = stmt.get(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// Create record
app.post('/api/records', async (req, res) => {
  try {
    const record = req.body;
    const id = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO records (
        id, control_number, school, course, status, workflow,
        hours, date_received, moa_value, moa_file_name, moa_type,
        legal_opinion_value, legal_opinion_file_name, legal_opinion_type, is_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(
      id, record.controlNumber, record.school, record.course, record.status, record.workflow,
      record.hours, record.dateReceived, record.moaValue, record.moaFileName, record.moaType,
      record.legalOpinionValue, record.legalOpinionFileName, record.legalOpinionType
    );

    // Try to sync to Firebase if online
    try {
      const fullRecord = {
        id,
        control_number: record.controlNumber,
        school: record.school,
        course: record.course,
        status: record.status,
        workflow: record.workflow,
        hours: record.hours,
        date_received: record.dateReceived,
        moa_value: record.moaValue,
        moa_file_name: record.moaFileName,
        moa_type: record.moaType,
        legal_opinion_value: record.legalOpinionValue,
        legal_opinion_file_name: record.legalOpinionFileName,
        legal_opinion_type: record.legalOpinionType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await syncRecordToFirebase(fullRecord);
      console.log('Record synced to Firebase successfully');
    } catch (syncError) {
      console.log('Failed to sync to Firebase (offline or error):', syncError.message);
      // Continue - record is saved locally even if sync fails
    }

    // Save database changes
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    res.status(201).json({ id, ...record });
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// Update record
app.put('/api/records/:id', (req, res) => {
  try {
    const record = req.body;

    const stmt = db.prepare(`
      UPDATE records SET
        control_number = ?, school = ?, course = ?, status = ?, workflow = ?,
        hours = ?, date_received = ?, moa_value = ?, moa_file_name = ?, moa_type = ?,
        legal_opinion_value = ?, legal_opinion_file_name = ?, legal_opinion_type = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      record.controlNumber, record.school, record.course, record.status, record.workflow,
      record.hours, record.dateReceived, record.moaValue, record.moaFileName, record.moaType,
      record.legalOpinionValue, record.legalOpinionFileName, record.legalOpinionType,
      req.params.id
    );

    res.json({ id: req.params.id, ...record });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// Delete record
app.delete('/api/records/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM records WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// Upload file
app.post('/api/files', (req, res) => {
  try {
    const { fileName, fileData, mimeType } = req.body;
    const id = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO files (id, file_name, file_data, mime_type)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, fileName, fileData, mimeType);

    res.status(201).json({ id, fileName });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get file
app.get('/api/files/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
    const file = stmt.get(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = file.file_data;

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData.split(',')[1], 'base64');

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Cloud Sync endpoints
app.get('/api/records/unsynced', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT id, control_number, school, course, status, workflow,
             hours, date_received, moa_file_name, moa_type,
             legal_opinion_file_name, legal_opinion_type, created_at
      FROM records
      WHERE is_synced = 0
      ORDER BY created_at DESC
    `);

    const records = stmt.all();
    res.json(records);
  } catch (error) {
    console.error('Error fetching unsynced records:', error);
    res.status(500).json({ error: 'Failed to fetch unsynced records' });
  }
});

app.post('/api/sync', async (req, res) => {
  try {
    const { recordIds } = req.body;

    if (!recordIds || !Array.isArray(recordIds)) {
      return res.status(400).json({ error: 'recordIds array is required' });
    }

    const results = [];
    const errors = [];

    for (const recordId of recordIds) {
      try {
        // Get the full record
        const stmt = db.prepare('SELECT * FROM records WHERE id = ?');
        const record = stmt.get(recordId);

        if (!record) {
          errors.push({ recordId, error: 'Record not found' });
          continue;
        }

        // Skip if already synced
        if (record.is_synced) {
          results.push({ recordId, status: 'already_synced' });
          continue;
        }

        // Sync to Firebase
        await syncRecordToFirebase(record);
        results.push({ recordId, status: 'synced' });

      } catch (error) {
        console.error(`Error syncing record ${recordId}:`, error);
        errors.push({ recordId, error: error.message });
      }
    }

    res.json({
      success: true,
      synced: results.filter(r => r.status === 'synced').length,
      already_synced: results.filter(r => r.status === 'already_synced').length,
      errors: errors.length,
      details: { results, errors }
    });

  } catch (error) {
    console.error('Error in sync endpoint:', error);
    res.status(500).json({ error: 'Failed to sync records' });
  }
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`SQLite database: ${DB_PATH}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Saving database before shutdown...');
  saveDatabase();
  process.exit(0);
});