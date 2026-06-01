import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { users } from '../db/schema/users.js';
import { refreshTokens } from '../db/schema/refreshTokens.js';
import { eq } from 'drizzle-orm';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken
} from '../lib/tokens.js';
import { db } from '../db/db.js';

const router = Router();

// ─── REGISTER ────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    // check if username taken
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (existing.length > 0) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // create user
    const { user, accessToken, refreshToken } = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ username, passwordHash, role })
      .returning({ id: users.id, username: users.username });

    if (!user) {
      throw new Error("Failed to create user");
    }

    // create tokens
    const accessToken  = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);

    // store refresh token in db
    await tx.insert(refreshTokens).values({
      token:     refreshToken,
      userId:    user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { user, accessToken, refreshToken };
    });

    // send refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,   // JS can't read this
      secure:   false,  // set true in production (HTTPS only)
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    res.status(201).json({ accessToken, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── LOGIN ───────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // check password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // create tokens
    const accessToken  = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);

    // store refresh token
    await db.insert(refreshTokens).values({
      token:     refreshToken,
      userId:    user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   false,
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── REFRESH ─────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    // verify token signature
    const payload = verifyRefreshToken(token);

    // check token exists in DB (not logged out)
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token));

    if (!stored) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    } 
      

    // check not expired
    if (stored.expiresAt < new Date()) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // issue new access token
    const accessToken = createAccessToken(payload.userId);
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── LOGOUT ──────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      // delete from DB
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    }

    // clear cookie
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;