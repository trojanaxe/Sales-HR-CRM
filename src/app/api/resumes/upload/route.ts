import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { error, ok, serverError, unauthorized } from "@/lib/api";
import { createCandidateFromResumeUpload } from "@/lib/resume/service";
import { UnsupportedResumeFormatError } from "@/lib/resume/textExtract";
import { DuplicateCandidate } from "@/lib/resume/duplicateDetection";

interface Resolution {
  action: "create_new" | "update_existing";
  candidateId?: string;
}

interface FileResult {
  fileName: string;
  status: "created" | "updated" | "duplicate" | "error";
  candidateId?: string;
  duplicates?: DuplicateCandidate[];
  parsedName?: string | null;
  parsedEmail?: string | null;
  message?: string;
}

/**
 * Bulk (or single) resume-database upload. Every file is parsed and
 * duplicate-checked independently; files with no likely duplicate are
 * created immediately, files that do look like duplicates are reported back
 * without persisting anything — the caller resubmits just that file with a
 * `resolutions` entry once the user picks an action.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("hr", "admin");
    const formData = await req.formData();

    const files = formData.getAll("resumes") as File[];
    if (files.length === 0) return error("No files uploaded");
    if (files.length > 50) return error("Upload at most 50 resumes at a time");

    const resolutionsRaw = formData.get("resolutions") as string | null;
    const resolutions: Record<string, Resolution> = resolutionsRaw
      ? JSON.parse(resolutionsRaw)
      : {};
    const source = (formData.get("source") as string | null) || undefined;
    const sourceDetail = (formData.get("sourceDetail") as string | null) || undefined;

    const results: FileResult[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const resolution = resolutions[file.name];

        const result = await createCandidateFromResumeUpload(
          buffer,
          file.name,
          file.type || "application/octet-stream",
          user.id,
          {
            resolution:
              resolution?.action === "update_existing" && resolution.candidateId
                ? { action: "update_existing", candidateId: resolution.candidateId }
                : resolution?.action === "create_new"
                  ? { action: "create_new" }
                  : undefined,
            source,
            sourceDetail,
          }
        );

        results.push({
          fileName: file.name,
          status: result.status,
          candidateId: result.candidateId,
          duplicates: result.duplicates,
          parsedName: result.parsedName,
          parsedEmail: result.parsedEmail,
        });
      } catch (e) {
        results.push({
          fileName: file.name,
          status: "error",
          message:
            e instanceof UnsupportedResumeFormatError
              ? e.message
              : e instanceof Error
                ? e.message
                : "Failed to process file",
        });
      }
    }

    return ok({ results });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
