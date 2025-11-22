import { pool } from '../database.js';

router.post('/register', async (req, res) => {
  const { nama, email, password } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO users(nama, email, password, role) VALUES($1,$2,$3,'user') RETURNING *",
      [nama, email, hash]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Error" });
  }
});
