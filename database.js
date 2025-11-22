import pkg from 'pg';
const { Pool } = pkg;

// Wajib ambil dari Render → External Database URL
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false  // penting untuk Render!
  }
});

// Optional: cek koneksi saat server start
pool.connect()
  .then(() => console.log("Connected to PostgreSQL Render ✓"))
  .catch(err => console.error("DB Connection Error:", err));
