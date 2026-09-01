import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = form.get("type") as string | null; // "cover" | "avatar"

  if (!file || !type) return NextResponse.json({ error: "Missing file or type" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const blob = await put(`${userId}/${type}.${ext}`, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
