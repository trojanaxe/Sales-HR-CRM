import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, error, unauthorized, serverError } from "@/lib/api";
import { nextReqId, nextCandidateId } from "@/lib/ids";
import { UploadType } from "@/lib/bulk-upload-schema";
import { createAccount, findDuplicateAccounts, resolveOrCreateContact } from "@/lib/accounts/service";

type Row = Record<string, string>;

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin", "hr");
    const body = await req.json();
    const { type, rows }: { type: UploadType; rows: Row[] } = body;

    if (!type || !Array.isArray(rows) || rows.length === 0)
      return error("type and rows are required");

    if (type === "requirements" && user.role === "hr")
      return error("HR users cannot bulk import requirements");

    const created: number[] = [];
    const errors: string[] = [];

    if (type === "candidates") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const skills = row.skills
            ? row.skills.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          const candidateId = await nextCandidateId();
          const validSources = ["bench", "external", "referral", "other"] as const;
          type CandidateSource = typeof validSources[number];
          const rawSource = (row.source || "").toLowerCase();
          const source: CandidateSource = (validSources as readonly string[]).includes(rawSource)
            ? rawSource as CandidateSource
            : "external";
          await prisma.candidate.create({
            data: {
              candidateId,
              name: row.name,
              email: row.email || null,
              phone: row.phone || null,
              linkedIn: row.linkedIn || null,
              currentLocation: row.currentLocation || null,
              willingToRelocate: /^yes|true|1$/i.test(row.willingToRelocate || ""),
              skills,
              experience: row.experience ? parseFloat(row.experience) : null,
              visaStatus: row.visaStatus || null,
              source,
              ownerId: user.id,
            },
          });
          created.push(i);
        } catch (e) {
          errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    if (type === "requirements") {
      // Look up contract mode IDs by label once
      const allModes = await prisma.contractMode.findMany();
      const modeMap: Record<string, string> = {};
      allModes.forEach((m) => { modeMap[m.label.toLowerCase()] = m.id; });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const reqId = await nextReqId();
          const contractModeId = row.contractMode
            ? modeMap[row.contractMode.toLowerCase()] ?? null
            : null;

          const validPriorities = ["high", "medium", "low"];
          const priority = validPriorities.includes((row.priority || "").toLowerCase())
            ? row.priority.toLowerCase()
            : "medium";

          const validStatuses = ["new", "in_progress", "on_hold", "closed_won", "closed_lost"];
          const status = validStatuses.includes((row.status || "").toLowerCase())
            ? row.status.toLowerCase()
            : "new";

          // Reuse an existing Account on an exact-name match (high
          // confidence, safe to auto-link); anything only fuzzily similar
          // still gets its own new Account rather than silently merging,
          // since there's no per-row confirmation UI in a batch import.
          let accountId: string | undefined;
          if (row.clientGroup) {
            const duplicates = await findDuplicateAccounts(row.clientGroup);
            const exact = duplicates.find((d) => d.reasons.includes("exact_name"));
            accountId = exact ? exact.id : (await createAccount({ name: row.clientGroup, industry: row.industry }, user.id)).id;
          }
          const contact = accountId && (row.contactName || row.contactEmail)
            ? await resolveOrCreateContact(accountId, { name: row.contactName, email: row.contactEmail, phone: row.contactPhone }, user.id)
            : null;

          await prisma.requirement.create({
            data: {
              reqId,
              clientGroup: row.clientGroup,
              jobRole: row.jobRole,
              priority: priority as "high" | "medium" | "low",
              status: status as "new" | "in_progress" | "on_hold" | "closed_won" | "closed_lost",
              contractModeId: contractModeId || null,
              location: row.location || null,
              experience: row.experience || null,
              budget: row.budget || null,
              vendor: row.vendor || null,
              industry: row.industry || null,
              contactName: row.contactName || null,
              contactEmail: row.contactEmail || null,
              contactPhone: row.contactPhone || null,
              jdLink: row.jdLink || null,
              sdrId: user.id,
              accountId,
              contactId: contact?.id,
            },
          });
          created.push(i);
        } catch (e) {
          errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    return ok({ created: created.length, failed: errors.length, errors });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
