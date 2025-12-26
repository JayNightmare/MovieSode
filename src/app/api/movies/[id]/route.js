/**
 * Fetch a single movie by id.
 */

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function GET(_req, { params }) {
  // In Next.js (app router) route handlers, `params` is provided as a Promise.
  const { id } = await params;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const movie = await db.collection("movies").findOne({ _id: new ObjectId(id) });
  if (!movie) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const episodes = await db
    .collection("episodes")
    .find({ movieId: id })
    .sort({ index: 1 })
    .toArray();

  return NextResponse.json({ movie: { ...movie, episodes } });
}
