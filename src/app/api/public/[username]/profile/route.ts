import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await prisma.profile.findUnique({ where: { username } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Strip userId from public response
  const { userId: _uid, ...publicProfile } = profile;
  return NextResponse.json(publicProfile);
}
