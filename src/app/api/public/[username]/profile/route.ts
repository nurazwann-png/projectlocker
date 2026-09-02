import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? "";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { userId: viewerUserId } = await auth();
  const profile = await prisma.profile.findUnique({ where: { username } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { userId: profileUserId, ...publicProfile } = profile;
  return NextResponse.json({
    ...publicProfile,
    ownerId: profileUserId,
    viewerIsAdmin: !!viewerUserId && viewerUserId === ADMIN_USER_ID,
  });
}
