import express from 'express';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize SQLite database
let db;
let SQL;

// ─── sql.js helper functions ───────────────────────────────────────────────
// sql.js uses step()/getAsObject() instead of better-sqlite3's .all()/.get()

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryGet(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function execute(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
}

// ─── DB column → camelCase mapper ─────────────────────────────────────────
function mapRecord(row) {
  return {
    id: row.id,
    controlNumber: row.control_number,
    school: row.school,
    course: row.course,
    status: row.status,
    workflow: row.workflow,
    hours: row.hours,
    dateReceived: row.date_received,
    moaValue: row.moa_value,
    moaFileName: row.moa_file_name,
    moaType: row.moa_type,
    legalOpinionValue: row.legal_opinion_value,
    legalOpinionFileName: row.legal_opinion_file_name,
    legalOpinionType: row.legal_opinion_type,
    is_synced: row.is_synced,
  };
}

// ─── Database init ─────────────────────────────────────────────────────────
async function initDatabase() {
  try {
    SQL = await initSqlJs();

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

    // Migration: add is_synced column if it doesn't exist
    try {
      db.run(`ALTER TABLE records ADD COLUMN is_synced INTEGER DEFAULT 0`);
      console.log('Migration: added is_synced column');
    } catch (e) {
      // Column already exists — that's fine
    }

    saveDatabase();
    console.log('SQLite database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// ─── Persist to disk ───────────────────────────────────────────────────────
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

// ─── API Routes ────────────────────────────────────────────────────────────

// GET all records
app.get('/api/records', (req, res) => {
  try {
    const rows = queryAll('SELECT * FROM records ORDER BY created_at DESC');
    res.json(rows.map(mapRecord));
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// GET single record
app.get('/api/records/:id', (req, res) => {
  try {
    const row = queryGet('SELECT * FROM records WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    res.json(mapRecord(row));
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// POST create record
app.post('/api/records', (req, res) => {
  try {
    const record = req.body;
    const id = crypto.randomUUID();

    execute(
      `INSERT INTO records (
        id, control_number, school, course, status, workflow,
        hours, date_received, moa_value, moa_file_name, moa_type,
        legal_opinion_value, legal_opinion_file_name, legal_opinion_type, is_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id,
        record.controlNumber,
        record.school,
        record.course,
        record.status,
        record.workflow,
        record.hours || null,
        record.dateReceived || null,
        record.moaValue || null,
        record.moaFileName || null,
        record.moaType || null,
        record.legalOpinionValue || null,
        record.legalOpinionFileName || null,
        record.legalOpinionType || null,
      ]
    );

    saveDatabase();
    res.status(201).json({ id, ...record });
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// PUT update record
app.put('/api/records/:id', (req, res) => {
  try {
    const record = req.body;

    execute(
      `UPDATE records SET
        control_number = ?, school = ?, course = ?, status = ?, workflow = ?,
        hours = ?, date_received = ?, moa_value = ?, moa_file_name = ?, moa_type = ?,
        legal_opinion_value = ?, legal_opinion_file_name = ?, legal_opinion_type = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        record.controlNumber,
        record.school,
        record.course,
        record.status,
        record.workflow,
        record.hours || null,
        record.dateReceived || null,
        record.moaValue || null,
        record.moaFileName || null,
        record.moaType || null,
        record.legalOpinionValue || null,
        record.legalOpinionFileName || null,
        record.legalOpinionType || null,
        req.params.id,
      ]
    );

    saveDatabase();
    res.json({ id: req.params.id, ...record });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// DELETE record
app.delete('/api/records/:id', (req, res) => {
  try {
    execute('DELETE FROM records WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// POST upload file
app.post('/api/files', (req, res) => {
  try {
    const { fileName, fileData, mimeType } = req.body;
    const id = crypto.randomUUID();

    execute(
      `INSERT INTO files (id, file_name, file_data, mime_type) VALUES (?, ?, ?, ?)`,
      [id, fileName, fileData, mimeType]
    );

    saveDatabase();
    res.status(201).json({ id, fileName });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET file
app.get('/api/files/:id', (req, res) => {
  try {
    const file = queryGet('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const buffer = Buffer.from(file.file_data.split(',')[1], 'base64');
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// ─── Start server ──────────────────────────────────────────────────────────
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