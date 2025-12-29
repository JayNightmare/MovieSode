/**
 * Serves subtitle VTT files for an episode.
 */
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(req, { params }) {
        try {
                const { id } = await params;
                if (!ObjectId.isValid(id)) {
                        return NextResponse.json(
                                { error: "Invalid ID" },
                                { status: 400 }
                        );
                }

                const db = await getDb();
                const episode = await db
                        .collection("episodes")
                        .findOne({ _id: new ObjectId(id) });

                if (!episode) {
                        return NextResponse.json(
                                { error: "Episode not found" },
                                { status: 404 }
                        );
                }

                if (!episode.hasSubtitles) {
                        return new NextResponse(
                                "WEBVTT\n\nNOTE No subtitles available",
                                {
                                        status: 200,
                                        headers: { "Content-Type": "text/vtt" },
                                }
                        );
                }

                // Subtitle file is expected to be next to the video file, with .vtt extension
                // e.g. episode-001.mp4 -> episode-001.vtt
                const videoPath = episode.filePath;
                const vttPath = videoPath.replace(/\.mp4$/, ".vtt");

                if (!fs.existsSync(vttPath)) {
                        return new NextResponse(
                                "WEBVTT\n\nNOTE Subtitle file missing",
                                {
                                        status: 200,
                                        headers: { "Content-Type": "text/vtt" },
                                }
                        );
                }

                const stream = fs.createReadStream(vttPath);
                return new NextResponse(stream, {
                        status: 200,
                        headers: {
                                "Content-Type": "text/vtt",
                                "Cache-Control": "public, max-age=3600",
                        },
                });
        } catch (err) {
                console.error("Subtitle API Error", err);
                return NextResponse.json(
                        { error: "Internal Server Error" },
                        { status: 500 }
                );
        }
}
