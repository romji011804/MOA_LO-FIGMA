# MOA & LO Tracking System

A full-stack web application for tracking Memorandum of Agreement (MOA) and Legal Opinion (LO) records with SQLite database integration.

## Features

- 📊 Dashboard with statistics and analytics
- ➕ Add/Edit records with file uploads or links
- 📋 View and search all records
- 📄 Individual record details
- 🔗 File storage with SQLite database
- ☁️ **Cloud Sync** - Manual upload to Firebase for multi-device access
- 🎨 Modern UI with dark mode support

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (file-based, no server required)
- **Cloud**: Firebase Firestore + Firebase Storage
- **Styling**: Tailwind CSS + Radix UI

## Prerequisites

- **Node.js** (v16 or higher) - Check with: `node --version`
- **npm** (comes with Node.js) - Check with: `npm --version`

## Firebase Setup (Optional - for Cloud Sync)

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Firestore Database and Storage in your Firebase project
3. Go to Project Settings > General > Your apps > Add Web App
4. Copy the Firebase configuration values
5. Update the `.env` file with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-actual-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Note**: Cloud sync is optional. The app works perfectly offline with local SQLite storage.

## Quick Start (Easiest Options)

### 🚀 Option 1: Development Mode (Recommended for Testing)

**Double-click** `open-app.bat` in your project folder:
- Starts both backend and frontend servers
- Opens in browser at `http://localhost:5173`
- Hot reload enabled for development

### 📱 Option 2: Built Version (For Production Use)

**Double-click** `serve-built.bat` in your project folder:
- Serves the optimized built application
- Opens in browser at `http://localhost:8080`
- Smaller file size, faster loading
- **Currently Working ✅**

### 🛠️ Option 3: Manual Control

Use these batch files for specific needs:
- `start-app.bat` - Development servers in separate windows
- `serve-built.bat` - Built app with proper static file serving

### 📁 Option 4: Manual Setup

1. Start backend: `node server.js`
2. For development: `npx vite --host --port 5173`
3. For built version: `node serve-dist.js` then visit `http://localhost:8080`

### 📱 Option 2: Manual Built Version

1. Start backend: `node server.js`
2. Open `dist/index.html` in your browser

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Application

Run both backend and frontend simultaneously:

```bash
npm start
```

This will start:
- **Backend API Server**: `http://localhost:3001`
- **Frontend React App**: `http://localhost:5173`

### Alternative: Run Separately

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Database

The application uses **SQLite** which automatically creates a `database.sqlite` file in the project root. No database server installation or configuration required!

## API Endpoints

### Records
- `GET /api/records` - Get all records
- `GET /api/records/:id` - Get single record
- `POST /api/records` - Create new record
- `PUT /api/records/:id` - Update record
- `DELETE /api/records/:id` - Delete record

### Files
- `POST /api/files` - Upload file
- `GET /api/files/:id` - Download file

### Cloud Sync
- `GET /api/records/unsynced` - Get records not yet synced to cloud
- `POST /api/sync` - Upload selected records to Firebase Firestore

## Cloud Sync Feature

The application includes a hybrid storage system combining local SQLite with optional cloud backup via Firebase.

### How It Works

1. **Local-First**: All records are saved immediately to local SQLite database
2. **Auto-Sync**: When online, records are automatically uploaded to Firebase Firestore
3. **Manual Sync**: Use the "Cloud Sync" tab to manually upload unsynced records
4. **File Handling**: Files are uploaded to Firebase Storage and URLs are stored in Firestore

### Sync Status

- `is_synced`: Boolean field tracking cloud sync status
- `0` (false): Not synced to cloud
- `1` (true): Successfully synced to cloud

### Benefits

- ✅ **Offline-First**: Works without internet connection
- ✅ **Multi-Device**: Access records across devices via cloud
- ✅ **Automatic Backup**: Cloud serves as backup for local data
- ✅ **No Data Loss**: Local data preserved even if cloud sync fails

## Database Schema

### Records Table
```sql
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  control_number TEXT NOT NULL,
  school TEXT NOT NULL,
  course TEXT NOT NULL,
  status TEXT CHECK(status IN ('Ongoing', 'Completed')) NOT NULL,
  workflow TEXT NOT NULL,
  hours TEXT,
  date_received TEXT,
  moa_value TEXT,
  moa_file_name TEXT,
  moa_type TEXT CHECK(moa_type IN ('file', 'link')),
  legal_opinion_value TEXT,
  legal_opinion_file_name TEXT,
  legal_opinion_type TEXT CHECK(legal_opinion_type IN ('file', 'link')),
  is_synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Files Table
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_data TEXT NOT NULL,
  mime_type TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Available Scripts

- `npm run dev` - Start frontend development server
- `npm run server` - Start backend server
- `npm start` - Start both servers concurrently
- `npm run build` - Build for production

### Project Structure

```
├── server.js              # Express backend server
├── .env                   # Environment variables
├── src/
│   ├── main.tsx          # React app entry
│   ├── app/
│   │   ├── App.tsx       # Main app component
│   │   ├── routes.ts     # React Router configuration
│   │   ├── records.ts    # API functions for records
│   │   ├── fileStorage.ts # API functions for files
│   │   └── components/   # React components
│   └── styles/           # CSS styles
└── package.json
```

## Migration from Local Storage

This application previously used browser localStorage. The current version uses SQLite for persistent, multi-user data storage with automatic file-based database creation.

## License

MIT License