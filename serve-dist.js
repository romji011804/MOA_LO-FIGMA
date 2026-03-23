import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Handle client-side routing for React Router
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.get('/add-record', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.get('/view-records', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.get('/cloud-sync', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.get('/record/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MOA & LO Tracking System served on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
});