// database.js
import pkg from 'pg';
const { Pool } = pkg;

// Pastikan di Render kamu sudah set env: DATABASE_URL
// Value-nya ambil dari "External Connection" di Render PostgreSQL
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // wajib di Render (SSL)
  },
});

// Fungsi untuk auto-create tabel kalau belum ada
export async function initDb() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inisialisasi database (cek / buat tabel)...');
    await client.query('BEGIN');

    // 1. users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nama        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20)  NOT NULL DEFAULT 'user',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // 2. reports
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tanggal      DATE NOT NULL DEFAULT CURRENT_DATE,
        isi_laporan  TEXT NOT NULL,
        status       VARCHAR(20) NOT NULL DEFAULT 'draft',
        completed_at TIMESTAMPTZ,
        approved_at  TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. issues
    await client.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id              SERIAL PRIMARY KEY,
        title           TEXT NOT NULL,
        description     TEXT,
        status          VARCHAR(20) NOT NULL DEFAULT 'open',
        priority        VARCHAR(20) NOT NULL DEFAULT 'medium',
        created_by_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. checklists
    await client.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id          SERIAL PRIMARY KEY,
        tipe        VARCHAR(50) NOT NULL,           -- harian/mingguan/tahunan
        nama_file   TEXT NOT NULL,
        path        TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. materials_utility
    await client.query(`
      CREATE TABLE IF NOT EXISTS materials_utility (
        id              SERIAL PRIMARY KEY,
        bagian_utility  VARCHAR(100) NOT NULL,      -- Boiler, WWTP, dll
        judul           TEXT NOT NULL,
        nama_file       TEXT NOT NULL,
        path            TEXT NOT NULL,
        uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database siap: semua tabel sudah dicek/dibuat.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error initDb:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Optional: cek koneksi saat start (log sekali)
pool
  .connect()
  .then((c) => {
    console.log('✅ Terkoneksi ke PostgreSQL');
    c.release();
  })
  .catch((err) => {
    console.error('❌ Gagal konek PostgreSQL:', err);
  });
