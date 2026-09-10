import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { code } = await req.json();
  const expected = process.env.COMMUNITY_ACCESS_CODE ?? "";
  if (!expected) return NextResponse.json({ ok: false }, { status: 500 });
  const ok = typeof code === "string" && code.trim().toUpperCase() === expected.toUpperCase();
  return NextResponse.json({ ok });
}
