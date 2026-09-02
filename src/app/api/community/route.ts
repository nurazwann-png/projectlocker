import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const profiles = await prisma.profile.findMany({
    where: { username: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { userId: true, username: true, bio: true, avatarUrl: true },
  });

  const counts = await Promise.all(
    profiles.map((p) => prisma.project.count({ where: { userId: p.userId } }))
  );

  const result = profiles.map((p, i) => ({
    username: p.username,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    projectCount: counts[i],
  }));

  return NextResponse.json(result);
}
