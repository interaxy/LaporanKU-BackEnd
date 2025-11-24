// routes/issues.js
import express from 'express';
import { pool } from '../database.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// GET /api/issues  -> ambil semua issue
router.get('/', authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id,
        i.title,
        i.description,
        i.status,
        i.priority,
        i.created_by_id,
        i.created_at,
        u.nama AS created_by_name
      FROM issues i
      LEFT JOIN users u ON u.id = i.created_by_id
      ORDER BY i.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error GET /api/issues:', err);
    res.status(500).json({ message: 'Failed to get issues' });
  }
});

// POST /api/issues  -> buat issue baru
router.post('/', authRequired, async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const currentUserId = req.user?.id || null;

    const normalizedPriority = ['low', 'medium', 'high'].includes(
      (priority || '').toLowerCase()
    )
      ? priority.toLowerCase()
      : 'medium';

    const insert = await pool.query(
      `
      INSERT INTO issues (title, description, status, priority, created_by_id)
      VALUES ($1, $2, 'open', $3, $4)
      RETURNING id, title, description, status, priority, created_by_id, created_at
    `,
      [title.trim(), description || null, normalizedPriority, currentUserId]
    );

    const row = insert.rows[0];

    // ambil nama pembuat
    let createdByName = null;
    if (currentUserId) {
      const u = await pool.query('SELECT nama FROM users WHERE id = $1', [
        currentUserId,
      ]);
      createdByName = u.rows[0]?.nama || null;
    }

    res.status(201).json({
      ...row,
      created_by_name: createdByName,
    });
  } catch (err) {
    console.error('Error POST /api/issues:', err);
    res.status(500).json({ message: 'Failed to create issue' });
  }
});

// PUT /api/issues/:id  -> ubah status (dipakai di front-end)
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['open', 'investigating', 'resolved', 'closed'];
    if (!allowed.includes((status || '').toLowerCase())) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // cek dulu issue-nya
    const existing = await pool.query(
      'SELECT * FROM issues WHERE id = $1',
      [id]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const issue = existing.rows[0];
    const isAdmin = (req.user?.role || '').toLowerCase() === 'admin';
    const isOwner = issue.created_by_id === req.user?.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const update = await pool.query(
      `
      UPDATE issues
      SET status = $1
      WHERE id = $2
      RETURNING id, title, description, status, priority, created_by_id, created_at
    `,
      [status.toLowerCase(), id]
    );

    const row = update.rows[0];

    // join untuk nama
    const u = await pool.query('SELECT nama FROM users WHERE id = $1', [
      row.created_by_id,
    ]);
    const createdByName = u.rows[0]?.nama || null;

    res.json({
      ...row,
      created_by_name: createdByName,
    });
  } catch (err) {
    console.error('Error PUT /api/issues/:id:', err);
    res.status(500).json({ message: 'Failed to update issue' });
  }
});

// DELETE /api/issues/:id
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT * FROM issues WHERE id = $1',
      [id]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const issue = existing.rows[0];
    const isAdmin = (req.user?.role || '').toLowerCase() === 'admin';
    const isOwner = issue.created_by_id === req.user?.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await pool.query('DELETE FROM issues WHERE id = $1', [id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Error DELETE /api/issues/:id:', err);
    res.status(500).json({ message: 'Failed to delete issue' });
  }
});

export default router;
