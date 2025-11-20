import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { authRequired, isAdmin } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `checklist-${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// POST /api/checklists  (admin upload)
router.post('/', authRequired, isAdmin, upload.single('file'), async (req, res) => {
  try {
    const { tipe } = req.body; // harian|mingguan|tahunan
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const r = await pool.query(
      'INSERT INTO checklists(tipe, nama_file, path) VALUES($1,$2,$3) RETURNING *',
      [tipe, req.file.originalname, `/uploads/${req.file.filename}`]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// GET /api/checklists?tipe=harian
router.get('/', authRequired, async (req, res) => {
  try {
    const { tipe } = req.query;
    let r;
    if (tipe) {
      r = await pool.query('SELECT * FROM checklists WHERE tipe=$1 ORDER BY uploaded_at DESC, id DESC', [tipe]);
    } else {
      r = await pool.query('SELECT * FROM checklists ORDER BY uploaded_at DESC, id DESC');
    }
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to get checklists' });
  }
});

// DELETE /api/checklists/:id (admin)
router.delete('/:id', authRequired, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM checklists WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to delete checklist' });
  }
});

export default router;
