import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? "";

export async function GET() {
  const { userId } = await auth();
  if (!userId || userId !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalProfiles,
    totalProjects,
    totalComments,
    acknowledgedComments,
    recentComments,
    commentsByProject,
    projectsByStatus,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.project.count(),
    prisma.comment.count(),
    prisma.comment.count({ where: { acknowledged: true } }),
    prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, authorName: true, body: true, createdAt: true, acknowledged: true, projectId: true },
    }),
    prisma.comment.groupBy({
      by: ["projectId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.project.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  // Enrich top commented projects with titles
  const topProjectIds = commentsByProject.map((c) => c.projectId);
  const topProjects = await prisma.project.findMany({
    where: { id: { in: topProjectIds } },
    select: { id: true, title: true, userId: true },
  });
  const projectMap = new Map(topProjects.map((p) => [p.id, p]));

  const topCommentedProjects = commentsByProject.map((c) => ({
    projectId: c.projectId,
    title: projectMap.get(c.projectId)?.title ?? "Unknown",
    count: c._count.id,
  }));

  // Enrich recent comments with project titles
  const recentProjectIds = [...new Set(recentComments.map((c) => c.projectId))];
  const recentProjects = await prisma.project.findMany({
    where: { id: { in: recentProjectIds } },
    select: { id: true, title: true },
  });
  const recentProjectMap = new Map(recentProjects.map((p) => [p.id, p.title]));
  const recentCommentsEnriched = recentComments.map((c) => ({
    ...c,
    projectTitle: recentProjectMap.get(c.projectId) ?? "Unknown",
  }));

  return NextResponse.json({
    totalProfiles,
    totalProjects,
    totalComments,
    acknowledgedComments,
    acknowledgedRate: totalComments > 0 ? Math.round((acknowledgedComments / totalComments) * 100) : 0,
    recentComments: recentCommentsEnriched,
    topCommentedProjects,
    projectsByStatus,
  });
}
