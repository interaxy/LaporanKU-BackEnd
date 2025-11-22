// middleware/auth.js
import jwt from 'jsonwebtoken';
import { pool } from '../database.js';

// Middleware: wajib login
export async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Token tidak ada, silakan login' });
    }

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret);

    // opsional: ambil user dari DB untuk memastikan masih ada
    const result = await pool.query(
      'SELECT id, nama, email, role FROM users WHERE id=$1',
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'User tidak ditemukan' });
    }

    // simpan ke req.user supaya bisa dipakai di route lain
    req.user = result.rows[0];

    next();
  } catch (err) {
    console.error('authRequired error:', err);
    return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
  }
}

// Middleware: hanya admin
export function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  if ((req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang boleh mengakses fitur ini' });
  }

  next();
}
