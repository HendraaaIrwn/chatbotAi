import { z } from "zod";

export const maxUploadBytes = 10 * 1024 * 1024;

const allowedExtensions = [".pdf", ".txt", ".md", ".csv", ".json", ".docx"];
const allowedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const fileIdListSchema = z.array(z.string().cuid()).max(10).optional();

export function validateProjectUpload(file: File) {
  const filename = file.name.trim();
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();

  if (!filename || !allowedExtensions.includes(extension)) {
    return "Only PDF, TXT, Markdown, CSV, JSON, and DOCX files are allowed.";
  }

  if (file.size <= 0) {
    return "The uploaded file is empty.";
  }

  if (file.size > maxUploadBytes) {
    return "Files must be 10 MB or smaller.";
  }

  if (file.type && !allowedMimeTypes.has(file.type)) {
    return "The uploaded file type is not allowed.";
  }

  return null;
}
