/**
 * Upload endpoint: accepts multipart form data, saves the movie file locally,
 * and creates a movie record for later processing.
 */

import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongodb";
import { UPLOAD_DIR } from "@/lib/paths";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const titleInput = (form.get("title") || "").toString().trim();
    const episodeLengthMin = Number(form.get("episodeLengthMin") || 22);

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!Number.isFinite(episodeLengthMin) || episodeLengthMin <= 0) {
      return NextResponse.json({ error: "Invalid episodeLengthMin" }, { status: 400 });
    }

    const originalFilename = file.name || "upload.bin";
    const parsed = path.parse(originalFilename);
    const safeBase = parsed.name.replace(/[^\w\-]+/g, "_") || "movie";
    const uniqueName = `${Date.now()}-${randomUUID()}${parsed.ext || ""}`;

    const uploadDir = path.join(process.cwd(), UPLOAD_DIR);
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const absolutePath = path.join(uploadDir, uniqueName);
    await writeFile(absolutePath, Buffer.from(arrayBuffer));

    const now = new Date();
    const doc = {
      title: titleInput || safeBase,
      originalFilename,
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
      episodeLengthMin,
      uploadPath: path.join(UPLOAD_DIR, uniqueName),
    };

    const db = await getDb();
    const res = await db.collection("movies").insertOne(doc);

    return NextResponse.json(
      { movieId: res.insertedId.toString(), uploadPath: doc.uploadPath },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
