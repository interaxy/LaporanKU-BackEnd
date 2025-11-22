import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import reportRoutes from './routes/reports.js';
import issuesRoutes from './routes/issues.js';
import checklistRoutes from './routes/checklists.js';
import dashboardRoutes from './routes/dashboard.js';
import materialsUtilityRoutes from './routes/materialsUtility.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🛡️ CORS
 * - Bisa diatur lewat ENV: CORS_ORIGIN="https://reportingutility.vercel.app,http://localhost:5173"
 * - Kalau ENV nggak ada, pakai default array di bawah
 */
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : [
      'https://laporankudeputy.vercel.app', // domain Vercel kamu
      'http://localhost:5173',               // untuk development lokal
    ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// Static folder untuk file upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🛣️ Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/materials-utility', materialsUtilityRoutes);

// Healthcheck (buat Render cek service hidup)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ✅ Penting untuk Render: listen di 0.0.0.0
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
