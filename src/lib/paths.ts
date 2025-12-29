/**
 * Centralized path helpers for upload/output storage.
 * Defaults to user Documents/MovieSode for a local-first experience.
 */

import os from "os";
import path from "path";

const home = os.homedir();
const docs = path.join(home, "Documents", "MovieSode");

export const UPLOAD_DIR = path.join(docs, "Uploads"); // where incoming files are saved (if uploaded)
export const OUTPUT_DIR = path.join(docs, "Episodes"); // where split episodes are written
