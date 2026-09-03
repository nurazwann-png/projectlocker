import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const views = await prisma.projectView.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, viewerName: true, viewerId: true, createdAt: true },
  });

  const map = new Map<string, { viewerName: string; viewerId: string | null; count: number; lastSeen: string }>();
  for (const v of views) {
    const key = v.viewerId ?? `guest:${v.viewerName}`;
    if (map.has(key)) {
      map.get(key)!.count++;
    } else {
      map.set(key, { viewerName: v.viewerName, viewerId: v.viewerId, count: 1, lastSeen: v.createdAt.toISOString() });
    }
  }

  return NextResponse.json({
    totalViews: views.length,
    uniqueViewers: map.size,
    viewers: Array.from(map.values()).sort((a, b) => b.count - a.count),
  });
}
