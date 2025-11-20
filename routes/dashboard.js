// server/routes/dashboard.js
import express from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// Helper: batas waktu bulan ini & bulan lalu
function monthBounds(d = new Date()) {
  const startThis = new Date(d.getFullYear(), d.getMonth(), 1);
  const startNext = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const startPrev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return { startThis, startNext, startPrev };
}

// GET /api/dashboard
router.get("/", authRequired, async (req, res) => {
  const isAdmin = req.user?.role === "admin";
  const userId = req.user?.id;

  const scopeFilter = isAdmin ? "" : "WHERE r.user_id = $1";
  const scopeParams = isAdmin ? [] : [userId];

  const { startThis, startNext, startPrev } = monthBounds();

  try {
    // ==== 1) KARTU ANGKA LAPORAN ====
    const totalSql = `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN status='selesai' THEN 1 ELSE 0 END)::int AS selesai,
        SUM(CASE WHEN status='disetujui' THEN 1 ELSE 0 END)::int AS disetujui
      FROM reports r
      ${scopeFilter}
    `;
    const totalRes = await pool.query(totalSql, scopeParams);
    const summary = totalRes.rows[0] || { total: 0, selesai: 0, disetujui: 0 };

    // ==== 2) RINGKASAN BULANAN ====
    const monthlySql = `
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - interval '11 months',
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) AS m
      )
      SELECT to_char(m.m, 'Mon') AS label,
             COALESCE(count(r.id), 0)::int AS jumlah,
             EXTRACT(MONTH FROM m.m)::int AS month_num
      FROM months m
      LEFT JOIN reports r
        ON date_trunc('month', r.tanggal) = m.m
        ${isAdmin ? "" : "AND r.user_id = $1"}
      GROUP BY m.m
      ORDER BY m.m
    `;
    const monthlyParams = isAdmin ? [] : [userId];
    const monthlyRes = await pool.query(monthlySql, monthlyParams);
    const monthly = monthlyRes.rows.map((r) => ({
      name: r.label,
      jumlah: r.jumlah,
    }));

    // ==== 3) PERBANDINGAN BULAN INI VS BULAN LALU ====
    const cmpSql = `
      SELECT
        SUM(CASE WHEN r.tanggal >= $1 AND r.tanggal < $2 THEN 1 ELSE 0 END)::int AS this_month,
        SUM(CASE WHEN r.tanggal >= $3 AND r.tanggal < $1 THEN 1 ELSE 0 END)::int AS last_month
      FROM reports r
      ${scopeFilter ? "WHERE r.user_id = $4" : ""}
    `;
    const cmpParams = isAdmin
      ? [startThis, startNext, startPrev]
      : [startThis, startNext, startPrev, userId];
    const cmpRes = await pool.query(cmpSql, cmpParams);
    const comparison = cmpRes.rows[0] || { this_month: 0, last_month: 0 };

    // ==== 4) AKTIVITAS ====
    const activitySql = `
      SELECT u.id, u.nama, COUNT(r.id)::int AS count
      FROM users u
      JOIN reports r ON r.user_id = u.id
      ${isAdmin ? "" : "WHERE r.user_id = $1"}
      GROUP BY u.id, u.nama
      ORDER BY count DESC, u.nama ASC
      LIMIT 10
    `;
    const activityParams = isAdmin ? [] : [userId];
    const activityRes = await pool.query(activitySql, activityParams);
    const activity = activityRes.rows.map((row, idx) => ({
      id: row.id,
      user: row.nama || "Pengguna",
      count: row.count,
      size: idx === 0 ? "large" : idx === 1 ? "medium" : "small",
      color: ["bg-blue-500", "bg-blue-400", "bg-blue-300"][Math.min(idx, 2)],
    }));

    // ==== 5) RIWAYAT LAPORAN ====
    const historySql = `
      SELECT r.id, r.tanggal, r.isi_laporan, r.status, u.nama
      FROM reports r
      JOIN users u ON u.id = r.user_id
      ${scopeFilter}
      ORDER BY r.tanggal DESC, r.id DESC
      LIMIT 20
    `;
    const historyRes = await pool.query(historySql, scopeParams);
    const history = historyRes.rows.map((r) => ({
      id: r.id,
      user: r.nama || "Pengguna",
      deskripsi: r.isi_laporan,
      tanggal: new Date(r.tanggal).toLocaleDateString("id-ID"),
      status: r.status,
    }));

    // ==== 6) STAFF (DATA KARYAWAN) ====
    const staffRes = await pool.query(
      "SELECT id, nama, role FROM users ORDER BY id DESC LIMIT 20"
    );
    const staff = staffRes.rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      detail: r.role,
    }));

    // ==== 7) ISSUE SUMMARY (TAMBAHAN UNTUK DASHBOARD) ====
    // Asumsi: ada tabel issues dengan kolom status: 'open' / 'closed'
    const issuesSql = `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)::int AS open,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)::int AS closed
      FROM issues
    `;
    const issuesRes = await pool.query(issuesSql);
    const issues = issuesRes.rows[0] || { total: 0, open: 0, closed: 0 };

    res.json({
      cards: {
        total: summary.total,
        selesai: summary.selesai,
        disetujui: summary.disetujui,
      },
      monthly,
      comparison,
      activity,
      history,
      staff,
      issues, // <== ini yang dipakai Dashboard untuk kartu Issue
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Failed to build dashboard",
      error: e.message,
    });
  }
});

export default router;