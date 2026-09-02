import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const comments = await prisma.comment.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: { id: true, parentId: true, authorName: true, body: true, createdAt: true },
  });
  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { authorName, body, parentId } = await req.json();
  if (!authorName?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Name and body required" }, { status: 400 });
  }
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Validate parentId if provided
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
    if (!parent || parent.parentId) {
      // Only allow one level of nesting (replies to replies not allowed)
      return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      projectId,
      parentId: parentId ?? null,
      authorName: authorName.trim().slice(0, 60),
      body: body.trim().slice(0, 500),
    },
    select: { id: true, parentId: true, authorName: true, body: true, createdAt: true },
  });
  return NextResponse.json(comment, { status: 201 });
}
