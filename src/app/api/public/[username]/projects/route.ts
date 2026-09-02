import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await prisma.profile.findUnique({ where: { username }, select: { userId: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const projects = await prisma.project.findMany({
    where: { userId: profile.userId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, description: true, status: true,
      liveUrl: true, techStack: true, tags: true,
      deploymentDate: true, coverImage: true, pinned: true,
      createdAt: true, updatedAt: true,
      // repoUrl and notes are intentionally excluded — private to the owner
    },
  });
  return NextResponse.json(projects);
}
