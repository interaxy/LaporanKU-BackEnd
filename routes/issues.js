import express from "express";
import { pool } from "../database.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// Get all issues
router.get("/", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id,
        i.title,
        i.description,
        i.status,
        i.priority,
        i.created_by_id,
        i.created_by_name,
        i.created_at
      FROM issues i
      ORDER BY i.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("ISSUE GET ERROR:", err);
    res.status(500).json({ error: "Failed to fetch issues" });
  }
});

// Create issue
router.post("/", authRequired, async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    const r = await pool.query(
      `
      INSERT INTO issues (title, description, status, priority, created_by_id, created_by_name)
      VALUES ($1, $2, 'open', $3, $4, $5)
      RETURNING *
      `,
      [title, description, priority, req.user.nama, req.user.id]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error("CREATE ISSUE ERROR:", err);
    res.status(500).json({ error: "Failed to create issue" });
  }
});

// Update status
router.put("/:id", authRequired, async (req, res) => {
  try {
    const { status } = req.body;

    const r = await pool.query(
      `
      UPDATE issues
      SET status=$1
      WHERE id=$2
      RETURNING *
      `,
      [status, req.params.id]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error("UPDATE ISSUE ERROR:", err);
    res.status(500).json({ error: "Failed to update issue" });
  }
});

// Delete issue
router.delete("/:id", authRequired, async (req, res) => {
  try {
    await pool.query("DELETE FROM issues WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE ISSUE ERROR:", err);
    res.status(500).json({ error: "Failed to delete issue" });
  }
});

export default router;
