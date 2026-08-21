import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));

// Route handlers for clean navigation
app.get('/guia', (req, res) => {
  res.sendFile(path.join(__dirname, 'guia.html'));
});

app.get('/cartelas', (req, res) => {
  res.sendFile(path.join(__dirname, 'cartelas.html'));
});

app.get('/cantadas', (req, res) => {
  res.sendFile(path.join(__dirname, 'cantadas.html'));
});

app.get('/privacidade', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacidade.html'));
});

app.get('/termos', (req, res) => {
  res.sendFile(path.join(__dirname, 'termos.html'));
});

app.get('/sobre', (req, res) => {
  res.sendFile(path.join(__dirname, 'sobre.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bingo Pro server running on http://0.0.0.0:${PORT}`);
});

