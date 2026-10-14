import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { CommerceErrorBody, CommerceErrorCode } from "./schemas";

export const SESSION_COOKIE = "persona_sid";

const STATUS: Record<CommerceErrorCode, number> = {
  NOT_FOUND: 404,
  OUT_OF_STOCK: 409,
  INSUFFICIENT_STOCK: 409,
  NOT_IN_CART: 404,
  INVALID_INPUT: 400,
  TRANSIENT: 503,
};

export function errorResponse(code: CommerceErrorCode, message: string): NextResponse<CommerceErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status: STATUS[code] });
}

export function transientError(): NextResponse<CommerceErrorBody> {
  return errorResponse("TRANSIENT", "The store service hiccuped. Please try again.");
}

/** Reads the session cookie, creating one if absent. Route handlers only. */
export async function getSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  jar.set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return id;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
