import express from "express";
import { db } from "./db/db.js";
import cookieParser from "cookie-parser";
import { sql } from 'drizzle-orm';
import authRoutes from './routes/authRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';

const app = express();
const PORT = process.env.PORT || 4242;

app.use(express.json());
app.use(cookieParser());

app.get('/', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    res.json({ connected: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ connected: false });
  }
});

app.use('/auth', authRoutes);
app.use('/players', playerRoutes);
app.use('/teams', teamRoutes)
app.use('/tournaments', tournamentRoutes)

app.listen(PORT, () => {
  console.log(`Listening to http://localhost:${PORT}`);
});