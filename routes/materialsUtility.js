// server/routes/materialsUtility.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { authRequired, isAdmin } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// folder untuk file materi utility
const uploadDir = path.join(__dirname, '..', 'uploads', 'materials');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, `material-${ts}-${safeName}`);
  }
});

const upload = multer({ storage });

/**
 * GET /api/materials-utility
 * ?bagian_utility=Boiler (opsional)
 * Semua user yang login boleh lihat
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const { bagian_utility } = req.query;
    let sql =
      'SELECT id, bagian_utility, judul, nama_file, path, uploaded_at FROM materials_utility';
    const params = [];

    if (bagian_utility) {
      sql += ' WHERE bagian_utility = $1';
      params.push(bagian_utility);
    }

    sql += ' ORDER BY uploaded_at DESC';
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to get materials' });
  }
});

/**
 * POST /api/materials-utility
 * body: bagian_utility, judul, file
 * Hanya admin bisa upload
 */
// POST /api/materials-utility
router.post(
  '/',
  authRequired,
  isAdmin,
  upload.single('file'), // field file di FormData harus bernama "file"
  async (req, res) => {
    try {
      const { bagian_utility, judul } = req.body;

      // Validasi basic
      if (!req.file) {
        return res.status(400).json({ message: 'File wajib diupload' });
      }
      if (!bagian_utility || !judul) {
        return res.status(400).json({ message: 'Bagian utility dan judul wajib diisi' });
      }

      const filePath = `/uploads/materials/${req.file.filename}`;
      const namaFile = req.file.originalname;
      const uploadedBy = req.user?.id || null; // diambil dari authRequired

      const r = await pool.query(
        `INSERT INTO materials_utility 
          (bagian_utility, judul, nama_file, path, uploaded_by)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, bagian_utility, judul, nama_file, path, uploaded_at`,
        [bagian_utility, judul, namaFile, filePath, uploadedBy]
      );

      return res.status(201).json(r.rows[0]);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Failed to upload material' });
    }
  }
);


/**
 * DELETE /api/materials-utility/:id
 * Hanya admin
 */
router.delete('/:id', authRequired, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const r = await pool.query(
      'SELECT path FROM materials_utility WHERE id = $1',
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const row = r.rows[0];

    // hapus file fisik (kalau ada)
    if (row.path) {
      const filePath = path.join(
        __dirname,
        '..',
        row.path.replace(/^\/+/, '')
      );
      fs.unlink(filePath, (err) => {
        if (err) {
          console.warn('Failed to delete material file:', err.message);
        }
      });
    }

    await pool.query('DELETE FROM materials_utility WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to delete material' });
  }
});

export default router;
