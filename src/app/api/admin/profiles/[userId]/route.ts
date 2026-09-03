import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? "";

async function checkAdmin(req: Request) {
  const { userId } = await auth();
  const pinToken = req.headers.get("x-admin-pin");
  const adminPin = process.env.ADMIN_PIN ?? "";
  return (!!userId && userId === ADMIN_USER_ID) || (!!adminPin && pinToken === adminPin);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;

  // Cascade: views → comments → projects → profile
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  await prisma.projectView.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.comment.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.project.deleteMany({ where: { userId } });
  await prisma.profile.delete({ where: { userId } });

  return NextResponse.json({ ok: true });
}
