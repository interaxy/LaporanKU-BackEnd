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

// ✅ CORS: IZINKAN VERCEL + LOCALHOST
app.use(cors({
  origin: [
    'https://reportingutility.vercel.app', // domain vercel kamu
    'http://localhost:5173'               // buat dev lokal
  ],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/issues', issuesRoutes);   
app.use('/api/checklists', checklistRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/materials-utility', materialsUtilityRoutes);

// Healthcheck
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
