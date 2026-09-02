import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  return NextResponse.json(profile ?? {});
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Validate username: alphanumeric + hyphens only, 3-30 chars
  if (body.username !== undefined) {
    if (body.username !== null && !/^[a-z0-9-]{3,30}$/.test(body.username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
  }
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: body,
    create: { userId, ...body },
  });
  return NextResponse.json(profile);
}
