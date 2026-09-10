import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  // Signed-in Clerk users pass automatically
  const { userId } = await auth();
  if (!userId) {
    // Guests must supply the access code via header
    const key = req.headers.get("x-community-key") ?? "";
    const expected = process.env.COMMUNITY_ACCESS_CODE ?? "";
    if (!expected || key.trim().toUpperCase() !== expected.toUpperCase())
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.profile.findMany({
    where: { username: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { userId: true, username: true, bio: true, avatarUrl: true },
  });

  const counts = await Promise.all(
    profiles.map((p) => prisma.project.count({ where: { userId: p.userId } }))
  );

  return NextResponse.json(
    profiles.map((p, i) => ({ username: p.username, bio: p.bio, avatarUrl: p.avatarUrl, projectCount: counts[i] }))
  );
}
