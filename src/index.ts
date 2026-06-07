import express from "express";
import cors from "cors";
import { db } from "./db/db.js";
import cookieParser from "cookie-parser";
import { sql } from 'drizzle-orm';
import authRoutes from './routes/authRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import fixtureRoutes from './routes/fixtureRoutes.js';
import matchRoutes from './routes/matchRoutes.js';

const app = express();
const PORT = process.env.PORT || 4242;

app.use(cors({
  origin:         process.env.CLIENT_URL ?? 'http://localhost:5173',
  credentials:    true,
}));
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
app.use('/matches', matchRoutes)
app.use('/tournaments', tournamentRoutes)
app.use('/', fixtureRoutes)

app.listen(PORT, () => {
  console.log(`Listening to http://localhost:${PORT}`);
});