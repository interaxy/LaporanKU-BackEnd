import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

// POST /api/auth/register  (create first admin or users)
router.post("/register", async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "email & password required" });

    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [
      email,
    ]);
    if (exists.rowCount > 0)
      return res.status(409).json({ message: "Email already used" });

    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      "INSERT INTO users(nama, email, password, role) VALUES($1,$2,$3,$4) RETURNING id,nama,email,role",
      [nama || "", email, hash, role === "admin" ? "admin" : "user"]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Register failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await pool.query(
      "SELECT id, nama, email, password, role FROM users WHERE email=$1",
      [email]
    );
    if (r.rowCount === 0)
      return res.status(401).json({ message: "Invalid credentials" });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    res.json({
      token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;
