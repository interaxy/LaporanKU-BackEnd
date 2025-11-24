// routes/issues.js
import express from 'express';
import { pool } from '../database.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/issues
 * Ambil semua issue (terurut terbaru)
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
         id,
         title,
         description,
         status,
         priority,
         created_by_id,
         created_by_name,
         created_at
       FROM issues
       ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (e) {
    console.error('GET /issues error:', e);
    res.status(500).json({ message: 'Failed to get issues' });
  }
});

/**
 * POST /api/issues
 * Buat issue baru
 */
router.post('/', authRequired, async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const userId = req.user?.id || null;
    const userName = req.user?.nama || req.user?.name || null;

    const r = await pool.query(
      `INSERT INTO issues
         (title, description, status, priority, created_by_id, created_by_name)
       VALUES ($1, $2, 'open', $3, $4, $5)
       RETURNING id, title, description, status, priority, created_by_id, created_by_name, created_at`,
      [
        title,
        description || '',
        priority || 'medium',
        userId,
        userName
      ]
    );

    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('POST /issues error:', e);
    res.status(500).json({ message: 'Failed to create issue' });
  }
});

/**
 * PUT /api/issues/:id
 * Ubah status / data issue
 */
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority } = req.body;

    // Kalau cuma ubah status
    if (status && !title && !description && !priority) {
      const r = await pool.query(
        `UPDATE issues
           SET status=$1
         WHERE id=$2
         RETURNING id, title, description, status, priority, created_by_id, created_by_name, created_at`,
        [status, id]
      );
      return res.json(r.rows[0]);
    }

    // Ubah field lain juga (opsional)
    const r = await pool.query(
      `UPDATE issues
         SET title       = COALESCE($1, title),
             description = COALESCE($2, description),
             status      = COALESCE($3, status),
             priority    = COALESCE($4, priority)
       WHERE id = $5
       RETURNING id, title, description, status, priority, created_by_id, created_by_name, created_at`,
      [
        title || null,
        description || null,
        status || null,
        priority || null,
        id
      ]
    );

    res.json(r.rows[0]);
  } catch (e) {
    console.error('PUT /issues/:id error:', e);
    res.status(500).json({ message: 'Failed to update issue' });
  }
});

/**
 * DELETE /api/issues/:id
 */
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM issues WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /issues/:id error:', e);
    res.status(500).json({ message: 'Failed to delete issue' });
  }
});

export default router;
