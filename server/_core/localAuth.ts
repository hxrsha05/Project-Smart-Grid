import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;

  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(originalHash, "hex");

  if (original.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(original, derived);
}

function getBodyString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function setSessionCookie(req: Request, res: Response, openId: string, name: string) {
  const sessionToken = await sdk.createSessionToken(openId, {
    name,
    expiresInMs: ONE_YEAR_MS,
  });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/local/signup", async (req: Request, res: Response) => {
    const name = getBodyString(req.body?.name);
    const username = normalizeUsername(getBodyString(req.body?.username));
    const password = getBodyString(req.body?.password);

    if (!name || !username || !password) {
      res.status(400).json({ error: "name, username, and password are required" });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: "username must be at least 3 characters" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "password must be at least 8 characters" });
      return;
    }

    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      res.status(409).json({ error: "username is already taken" });
      return;
    }

    const openId = `local_${randomBytes(12).toString("hex")}`;
    const passwordHash = hashPassword(password);

    await db.upsertUser({
      openId,
      username,
      name,
      passwordHash,
      loginMethod: "local",
      lastSignedIn: new Date(),
    });

    await setSessionCookie(req, res, openId, name);
    res.status(201).json({ success: true });
  });

  app.post("/api/auth/local/login", async (req: Request, res: Response) => {
    const username = normalizeUsername(getBodyString(req.body?.username));
    const password = getBodyString(req.body?.password);

    if (!username || !password) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }

    const user = await db.getUserByUsername(username);
    if (user) {
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      await setSessionCookie(req, res, user.openId, user.name || user.username || username);
      res.json({ success: true });
      return;
    }

    const openId = `local_${randomBytes(12).toString("hex")}`;

    await db.upsertUser({
      openId,
      username,
      name: username,
      passwordHash: hashPassword(password),
      loginMethod: "local",
      lastSignedIn: new Date(),
    });

    await setSessionCookie(req, res, openId, username);
    res.json({ success: true });
  });
}
