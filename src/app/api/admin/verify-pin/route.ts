import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { pin } = await req.json();
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return NextResponse.json({ error: "PIN not configured" }, { status: 503 });
  if (pin !== adminPin) return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  return NextResponse.json({ token: adminPin });
}
