/**
 * Centralized path helpers for upload/output storage.
 * Assumes local filesystem use (perfect for a personal tool MVP).
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
export const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";
