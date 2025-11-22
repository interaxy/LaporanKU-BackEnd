import express from 'express';
import { pool } from '../database.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports
router.get('/', authRequired, async (req, res) => {
  try {
    const { userId: qUserId } = req.query;

    let r;
    if (qUserId) {
      r = await pool.query(
        'SELECT r.*, u.nama as created_by_name FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.user_id = $1 ORDER BY r.tanggal DESC, r.id DESC',
        [qUserId]
      );
    } else {
      // Tambahkan JOIN ke users table untuk ambil created_by_name
      r = await pool.query(
        'SELECT r.*, u.nama as created_by_name FROM reports r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.tanggal DESC, r.id DESC'
      );
    }

    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to get reports' });
  }
});

// POST /api/reports
router.post('/', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { isi_laporan, tanggal } = req.body;
    
    const result = await pool.query(
      'INSERT INTO reports(user_id, tanggal, isi_laporan, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [userId, tanggal || new Date(), isi_laporan || '', 'draft']
    );
    
    // Ambil user info untuk response
    const r = await pool.query(
      'SELECT r.*, u.nama as created_by_name FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = $1',
      [result.rows[0].id]
    );
    
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to create report' });
  }
});

// PUT /api/reports/:id
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const { isi_laporan, tanggal, status } = req.body;

    // Ownership check kecuali admin
    if (role !== 'admin') {
      const o = await pool.query('SELECT user_id FROM reports WHERE id=$1', [id]);
      if (o.rowCount === 0) {
        return res.status(404).json({ message: 'Not found' });
      }
      if (o.rows[0].user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    // Update dengan status jika disediakan
    const r = await pool.query(
      'UPDATE reports SET isi_laporan=$1, tanggal=$2, status=$3 WHERE id=$4 RETURNING *',
      [isi_laporan || '', tanggal || new Date(), status || 'draft', id]
    );
    
    // Ambil dengan nama user
    const result = await pool.query(
      'SELECT r.*, u.nama as created_by_name FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = $1',
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update report' });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'admin') {
      const o = await pool.query('SELECT user_id FROM reports WHERE id=$1', [id]);
      if (o.rowCount === 0) {
        return res.status(404).json({ message: 'Not found' });
      }
      if (o.rows[0].user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    await pool.query('DELETE FROM reports WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to delete report' });
  }
});

// Tandai selesai
router.post('/:id/complete', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.id;
    const role = req.user.role;

    if (role !== 'admin') {
      const o = await pool.query('SELECT user_id FROM reports WHERE id=$1', [id]);
      if (o.rowCount === 0) return res.status(404).json({ message: 'Not found' });
      if (o.rows[0].user_id !== uid) return res.status(403).json({ message: 'Forbidden' });
    }

    const r = await pool.query(
      "UPDATE reports SET status='selesai', completed_at=NOW() WHERE id=$1 RETURNING *",
      [id]
    );
    
    const result = await pool.query(
      'SELECT r.*, u.nama as created_by_name FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = $1',
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to complete report' });
  }
});

// Setujui (admin)
router.post('/:id/approve', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await pool.query(
      "UPDATE reports SET status='disetujui', approved_at=NOW() WHERE id=$1",
      [id]
    );
    
    const result = await pool.query(
      'SELECT r.*, u.nama as created_by_name FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = $1',
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to approve report' });
  }
});

export default router;
