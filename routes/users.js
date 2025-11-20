import express from 'express';
import { pool } from '../db.js';
import { authRequired, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users (admin only)
router.get('/', authRequired, isAdmin, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, nama, email, role FROM users ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// POST /api/users (admin only)
router.post('/', authRequired, isAdmin, async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email & password required' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rowCount > 0) return res.status(409).json({ message: 'Email already used' });

    // Reuse register logic by calling DB directly (hash at SQL or here)
    const bcrypt = (await import('bcryptjs')).default;
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users(nama, email, password, role) VALUES($1,$2,$3,$4) RETURNING id,nama,email,role',
      [nama || '', email, hash, role === 'admin' ? 'admin' : 'user']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// PUT /api/users/:id (admin only)
router.put('/:id', authRequired, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, email, role, password } = req.body;
    if (password) {
      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET nama=$1, email=$2, role=$3, password=$4 WHERE id=$5',
        [nama || '', email, role, hash, id]);
    } else {
      await pool.query('UPDATE users SET nama=$1, email=$2, role=$3 WHERE id=$4',
        [nama || '', email, role, id]);
    }
    const r = await pool.query('SELECT id, nama, email, role FROM users WHERE id=$1', [id]);
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', authRequired, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;
