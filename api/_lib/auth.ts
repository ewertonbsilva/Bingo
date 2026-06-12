import crypto from "node:crypto";
import { getUserById } from "./db.js";
import { json } from "./http.js";

const authSecret = process.env.AUTH_SECRET || "bingo-tematico-dev-secret";

function readCookie(cookieHeader = "", name: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function createToken(userId: number) {
  const payload = String(userId);
  const signature = crypto.createHmac("sha256", authSecret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export async function getAuthenticatedUser(req: any) {
  const raw = readCookie(req.headers?.cookie, "bingo_auth");
  if (!raw) return null;

  const [userIdText, signature] = raw.split(".");
  if (!userIdText || !signature) return null;

  const expected = crypto.createHmac("sha256", authSecret).update(userIdText).digest("hex");
  if (signature !== expected) return null;

  const userId = Number(userIdText);
  if (!Number.isFinite(userId)) return null;

  return getUserById(userId);
}

export function setAuthCookie(res: any, userId: number) {
  const secure = process.env.NODE_ENV === "production";
  const token = createToken(userId);
  res.setHeader("Set-Cookie", `bingo_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`);
}

export function clearAuthCookie(res: any) {
  const secure = process.env.NODE_ENV === "production";
  res.setHeader("Set-Cookie", `bingo_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
}

export async function requireAuth(req: any, res: any) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    json(res, 401, { error: "Sessao expirada. Faca login novamente." });
    return null;
  }
  return user;
}

export async function requireAdmin(req: any, res: any) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    json(res, 403, { error: "Acesso permitido apenas para administradores." });
    return null;
  }
  return user;
}
