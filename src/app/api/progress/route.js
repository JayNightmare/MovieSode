/**
 * Progress API
 * - GET: ?movieId=<id> -> list progress docs for that movie
 * - POST: upsert progress for an episode
 */

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId");
  if (!movieId) {
    return NextResponse.json({ error: "Missing movieId" }, { status: 400 });
  }
  const db = await getDb();
  const progress = await db
    .collection("progress")
    .find({ movieId })
    .sort({ updatedAt: -1 })
    .toArray();
  return NextResponse.json({ progress });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const movieId = (body.movieId || "").toString();
  const episodeId = (body.episodeId || "").toString();
  const currentTimeSec = Number(body.currentTimeSec || 0);

  if (!movieId || !ObjectId.isValid(episodeId) || !Number.isFinite(currentTimeSec)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = await getDb();
  const now = new Date();
  await db.collection("progress").updateOne(
    { movieId, episodeId },
    {
      $set: {
        movieId,
        episodeId,
        currentTimeSec,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, updatedAt: now.toISOString() });
}
