import express from 'express';
import { pool } from '../db.js';
import { authRequired, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// helper untuk ambil 1 issue lengkap (dengan nama pembuat)
async function getIssueById(id) {
  const r = await pool.query(
    `SELECT 
       i.id,
       i.title,
       i.description,
       i.status,
       i.priority,
       i.created_at,
       i.updated_at,
       i.created_by AS created_by_id,
       u.nama AS created_by_name,
       u.email AS created_by_email
     FROM issues i
     LEFT JOIN users u ON i.created_by = u.id
     WHERE i.id = $1`,
    [id]
  );
  return r.rows[0];
}

// GET /api/issues?status=&priority=
router.get('/', authRequired, async (req, res) => {
  try {
    const { status, priority } = req.query;
    const params = [];
    const whereParts = [];

    if (status) {
      params.push(status);
      whereParts.push(`i.status = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      whereParts.push(`i.priority = $${params.length}`);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const r = await pool.query(
      `SELECT 
         i.id,
         i.title,
         i.description,
         i.status,
         i.priority,
         i.created_at,
         i.updated_at,
         i.created_by AS created_by_id,
         u.nama AS created_by_name,
         u.email AS created_by_email
       FROM issues i
       LEFT JOIN users u ON i.created_by = u.id
       ${whereClause}
       ORDER BY i.created_at DESC`,
      params
    );

    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to get issues' });
  }
});


// POST /api/issues  (SEMUA user login boleh buat)
router.post('/', authRequired, async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const status = 'open';
    const prio = ['low', 'medium', 'high'].includes((priority || '').toLowerCase())
      ? priority.toLowerCase()
      : 'medium';

    const insert = await pool.query(
      `INSERT INTO issues (title, description, status, priority, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [title.trim(), description || '', status, prio, req.user.id]
    );

    const issue = await getIssueById(insert.rows[0].id);
    res.status(201).json(issue);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to create issue' });
  }
});


// PUT /api/issues/:id  (admin atau pemilik issue)
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;

    // cek dulu siapa pemilik issue
    const owner = await pool.query('SELECT created_by FROM issues WHERE id=$1', [id]);
    if (owner.rowCount === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    const createdBy = owner.rows[0].created_by;
    const isOwner = createdBy === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      params.push(title);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(description);
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(status);
    }
    if (priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      params.push(priority);
    }

    fields.push(`updated_at = NOW()`);

    if (!fields.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    const sql = `UPDATE issues SET ${fields.join(', ')} WHERE id = $${params.length}`;

    await pool.query(sql, params);

    const issue = await getIssueById(id);
    res.json(issue);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update issue' });
  }
});


// DELETE /api/issues/:id  (admin atau pemilik issue)
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    const owner = await pool.query('SELECT created_by FROM issues WHERE id=$1', [id]);
    if (owner.rowCount === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    const createdBy = owner.rows[0].created_by;
    const isOwner = createdBy === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await pool.query('DELETE FROM issues WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to delete issue' });
  }
});


export default router;
