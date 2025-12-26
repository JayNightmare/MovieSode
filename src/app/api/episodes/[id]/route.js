/**
 * Streams an episode video file by episode id with Range support.
 */

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import path from "path";
import fs from "fs";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const { id } = await params;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const episode = await db.collection("episodes").findOne({ _id: new ObjectId(id) });
  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.isAbsolute(episode.filePath)
    ? episode.filePath
    : path.join(process.cwd(), episode.filePath);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stat = await fs.promises.stat(filePath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  if (range) {
    const matches = range.match(/bytes=(\d+)-(\d*)/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid range" }, { status: 416 });
    }
    const start = parseInt(matches[1], 10);
    const end = matches[2] ? parseInt(matches[2], 10) : fileSize - 1;
    if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
      return NextResponse.json({ error: "Invalid range" }, { status: 416 });
    }

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });
    return new NextResponse(stream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": "video/mp4",
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Length": fileSize.toString(),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    },
  });
}
