/**
 * Movies API
 * - GET: list movies
 * - POST: create a movie record (metadata only for now)
 *
 * Next steps will add upload + worker-based processing.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  const movies = await db
    .collection("movies")
    .find({}, { projection: { uploadPath: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ movies });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));

  const title = (body.title || "").trim();
  const originalFilename = (body.originalFilename || "").trim();
  const episodeLengthMin = Number(body.episodeLengthMin || 22);

  if (!title || !originalFilename || !Number.isFinite(episodeLengthMin)) {
    return NextResponse.json(
      { error: "Missing title/originalFilename/episodeLengthMin" },
      { status: 400 }
    );
  }

  const now = new Date();
  const doc = {
    title,
    originalFilename,
    status: "uploaded",
    createdAt: now,
    updatedAt: now,
    episodeLengthMin,
    uploadPath: body.uploadPath || "",
  };

  const db = await getDb();
  const res = await db.collection("movies").insertOne(doc);

  return NextResponse.json({ movieId: res.insertedId.toString() }, { status: 201 });
}
