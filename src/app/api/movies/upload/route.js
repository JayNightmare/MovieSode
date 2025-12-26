/**
 * Upload endpoint: accepts multipart form data OR a local file path,
 * saves/records the movie location, creates a movie record, and kicks off
 * background processing.
 */

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { getDb } from "@/lib/mongodb";
import { UPLOAD_DIR } from "@/lib/paths";

export const runtime = "nodejs";

function getUploadBaseDir() {
  return path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.join(process.cwd(), UPLOAD_DIR);
}

function triggerWorker(movieId) {
  try {
    const workerPath = path.join(process.cwd(), "worker", "processMovie.js");
    const child = spawn("node", [workerPath, movieId], {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
  } catch (err) {
    console.error("Failed to spawn worker", err);
  }
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const localFilePathInput = (form.get("localFilePath") || "").toString().trim();
    const titleInput = (form.get("title") || "").toString().trim();
    const episodeLengthMin = Number(form.get("episodeLengthMin") || 22);

    if (!Number.isFinite(episodeLengthMin) || episodeLengthMin <= 0) {
      return NextResponse.json({ error: "Invalid episodeLengthMin" }, { status: 400 });
    }

    let absolutePath = "";
    let originalFilename = "";
    let titleFallback = "";

    if (localFilePathInput) {
      const resolved = path.isAbsolute(localFilePathInput)
        ? localFilePathInput
        : path.resolve(localFilePathInput);

      if (!fs.existsSync(resolved)) {
        return NextResponse.json({ error: "Local file path not found" }, { status: 400 });
      }
      absolutePath = resolved;
      originalFilename = path.basename(resolved);
      titleFallback = path.parse(resolved).name;
    } else {
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }
      originalFilename = file.name || "upload.bin";
      const parsed = path.parse(originalFilename);
      const safeBase = parsed.name.replace(/[^\w\-]+/g, "_") || "movie";
      const uniqueName = `${Date.now()}-${randomUUID()}${parsed.ext || ""}`;

      const uploadDir = getUploadBaseDir();
      await mkdir(uploadDir, { recursive: true });

      const arrayBuffer = await file.arrayBuffer();
      absolutePath = path.join(uploadDir, uniqueName);
      await writeFile(absolutePath, Buffer.from(arrayBuffer));
      titleFallback = safeBase;
    }

    const now = new Date();
    const doc = {
      title: titleInput || titleFallback,
      originalFilename,
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
      episodeLengthMin,
      uploadPath: absolutePath,
    };

    const db = await getDb();
    const res = await db.collection("movies").insertOne(doc);

    // Kick off background processing (ffmpeg worker)
    triggerWorker(res.insertedId.toString());

    return NextResponse.json(
      { movieId: res.insertedId.toString(), uploadPath: doc.uploadPath },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
