/**
 * Retry endpoint: manually re-trigger the worker for a movie.
 * Useful if processing failed or got hung.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { triggerWorker } from "@/lib/workerHelper";
import { ObjectId } from "mongodb";

export async function POST(req, { params }) {
        try {
                const { id } = await params;
                if (!id || !ObjectId.isValid(id)) {
                        return NextResponse.json(
                                { error: "Invalid ID" },
                                { status: 400 }
                        );
                }

                const db = await getDb();
                const movie = await db
                        .collection("movies")
                        .findOne({ _id: new ObjectId(id) });

                if (!movie) {
                        return NextResponse.json(
                                { error: "Movie not found" },
                                { status: 404 }
                        );
                }

                // Update status to processing again
                await db.collection("movies").updateOne(
                        { _id: new ObjectId(id) },
                        {
                                $set: {
                                        status: "processing",
                                        error: null, // clear previous errors
                                        updatedAt: new Date(),
                                },
                        }
                );

                // Trigger worker
                triggerWorker(id);

                return NextResponse.json({
                        status: "processing",
                        message: "Worker restarted",
                });
        } catch (err) {
                console.error("Retry failed", err);
                return NextResponse.json(
                        { error: "Failed to retry" },
                        { status: 500 }
                );
        }
}
