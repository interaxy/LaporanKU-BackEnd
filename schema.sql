-- PostgreSQL schema for LaporanKU
-- Database: utility_reporting

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL DEFAULT '',
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  isi_laporan TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS checklists (
  id SERIAL PRIMARY KEY,
  tipe VARCHAR(20) NOT NULL, -- harian|mingguan|tahunan
  nama_file VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABEL ISSUE TRACKING
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'open',       -- open | investigating | resolved | closed
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',   -- low | medium | high
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  departemen VARCHAR(100) NOT NULL,     -- Utility, Produksi, QC, dsb
  judul      VARCHAR(255) NOT NULL,
  nama_file  VARCHAR(255) NOT NULL,
  path       VARCHAR(255) NOT NULL,     -- /uploads/materi-xxxx.pdf
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_by INTEGER REFERENCES users(id)
);


-- (Opsional) Admin default via SQL (ganti email/password hash sesuai kebutuhan)
-- INSERT INTO users (nama, email, password, role)
-- VALUES ('Admin', 'admin@example.com', '$2a$10$5H9vAB8Tz3v6JvZb/8QAIeQqgZ6zq5xJ4rS8wz8u1t1y1x5Y4xJNa', 'admin');
-- hash di atas hanyalah placeholder, harap buat via register endpoint atau ganti dengan hash bcrypt valid.
