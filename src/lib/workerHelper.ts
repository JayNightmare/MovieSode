/**
 * Shared helper to trigger the background worker process.
 */
import { spawn } from "child_process";
import path from "path";

export function triggerWorker(movieId: string) {
        try {
                const workerPath = path.join(
                        process.cwd(),
                        "worker",
                        "processMovie.js"
                );
                // Using 'node' to spawn. Ensure node is in path or use process.execPath
                const child = spawn("node", [workerPath, movieId], {
                        stdio: "ignore",
                        detached: true,
                });
                child.unref();
                console.log(`[WorkerHelper] Triggered worker for ${movieId}`);
        } catch (err) {
                console.error("[WorkerHelper] Failed to spawn worker", err);
                throw err; // Re-throw so caller knows it failed
        }
}
