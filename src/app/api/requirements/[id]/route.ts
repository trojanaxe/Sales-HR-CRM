import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, notFound, validationError, serverError } from "@/lib/api";
import { parseJDAndPersist } from "@/lib/resume/service";
import { createAccount, findDuplicateAccounts, resolveOrCreateContact } from "@/lib/accounts/service";
import { validateRequirementFields, validateEnumFields } from "@/lib/requirements/validation";
import type { ReqStatus, Priority, Negotiable, WorkMode } from "@prisma/client";

const MAX_JD_TEXT_LENGTH = 20000;

// Editable Requirement fields only — NOT a spread of the raw request body.
// RequirementForm's `existing` prop is the full GET response (sdr,
// assignedHR, contractMode, collaborators, notes, pipelineEntries, account,
// contact, sdrId/assignedHRId FKs, etc.), which the edit form's state then
// carries straight back into the PATCH body. Prisma's checked update input
// rejects those relation objects/FK scalars, so spreading them causes a
// silent-to-the-user 500 ("Unknown argument `sdrId`..."). Whitelisting here
// is the actual fix — see .agents/decisions.md.
const EDITABLE_FIELDS = [
  "clientGroup", "jobRole", "priority", "status", "closingDate",
  "vendor", "contactName", "contactRole", "contactLinkedIn", "contactEmail", "contactPhone",
  "experience", "budget", "location", "contractModeId", "industry", "negotiable", "workMode",
  "meetingStatus", "jdReceived", "jdLink", "jdText", "wonLostReason",
] as const;

interface EditableRequirementFields {
  clientGroup?: string; jobRole?: string; priority?: string; status?: string; closingDate?: string;
  vendor?: string; contactName?: string; contactRole?: string; contactLinkedIn?: string;
  contactEmail?: string; contactPhone?: string; experience?: string; budget?: string; location?: string;
  contractModeId?: string; industry?: string; negotiable?: string; workMode?: string;
  meetingStatus?: string; jdReceived?: boolean; jdLink?: string; jdText?: string; wonLostReason?: string;
}

const include = {
  sdr: { select: { id: true, name: true, email: true } },
  assignedHR: { select: { id: true, name: true, email: true } },
  contractMode: true,
  account: { select: { id: true, accountId: true, name: true } },
  contact: { select: { id: true, name: true } },
  collaborators: { include: { user: { select: { id: true, name: true } } } },
  notes: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  pipelineEntries: {
    include: {
      candidate: { select: { id: true, candidateId: true, name: true, skills: true } },
      stage: true,
    },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const req = await prisma.requirement.findUnique({ where: { id }, include });
    if (!req) return notFound("Requirement");
    return ok(req);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) return notFound("Requirement");

    // sales can only edit their own reqs; HR and admin can edit any
    if (user.role === "sales" && existing.sdrId !== user.id) return forbidden();

    const body = await req.json();
    const { accountResolution } = body;
    const fields: EditableRequirementFields = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) (fields as Record<string, unknown>)[field] = body[field];
    }

    // A bare `{ priority }` patch is how HR sets/updates priority from the
    // requirement detail page (Part 4) — that's not a resubmission of the
    // New Requirement form, so it's exempt from the form's mandatory-field
    // gate (Part 1.4). Anything touching real form fields still validates
    // against the merged record (existing + patch), not just the raw body,
    // so untouched fields already on file don't spuriously fail.
    const isPriorityOnlyPatch = Object.keys(fields).length === 1 && fields.priority !== undefined;
    if (!isPriorityOnlyPatch) {
      const merged = { ...existing, ...fields };
      const missingFields = validateRequirementFields(merged);
      if (missingFields.length > 0)
        return validationError(`Missing required field(s): ${missingFields.join(", ")}`, missingFields);
      const enumIssue = validateEnumFields(merged);
      if (enumIssue) return error(enumIssue);
    }

    if (fields.jdText && fields.jdText.length > MAX_JD_TEXT_LENGTH)
      return error(`JD text is too long (max ${MAX_JD_TEXT_LENGTH.toLocaleString()} characters)`);

    let accountId = existing.accountId;
    if (fields.clientGroup && fields.clientGroup !== existing.clientGroup) {
      if (accountResolution?.action === "use_existing") {
        accountId = accountResolution.accountId;
      } else if (accountResolution?.action === "create_new") {
        accountId = (await createAccount({ name: fields.clientGroup }, user.id)).id;
      } else {
        const duplicates = await findDuplicateAccounts(fields.clientGroup);
        if (duplicates.length > 0) return ok({ status: "duplicate_account", duplicates }, 200);
        accountId = (await createAccount({ name: fields.clientGroup }, user.id)).id;
      }
    }

    let contactId = existing.contactId;
    if (fields.contactName || fields.contactEmail) {
      const contact = await resolveOrCreateContact(
        accountId!,
        {
          name: fields.contactName ?? existing.contactName,
          role: fields.contactRole ?? existing.contactRole,
          email: fields.contactEmail ?? existing.contactEmail,
          phone: fields.contactPhone ?? existing.contactPhone,
          linkedIn: fields.contactLinkedIn ?? existing.contactLinkedIn,
        },
        user.id
      );
      contactId = contact?.id ?? contactId;
    }

    const updated = await prisma.requirement.update({
      where: { id },
      data: {
        ...fields,
        status: fields.status as ReqStatus | undefined,
        priority: fields.priority as Priority | undefined,
        negotiable: fields.negotiable as Negotiable | undefined,
        workMode: fields.workMode as WorkMode | undefined,
        accountId,
        contactId,
        closingDate: fields.closingDate ? new Date(fields.closingDate) : undefined,
        updatedAt: new Date(),
      },
      include,
    });

    // Best-effort: re-extract JD skills whenever the pasted JD text changes.
    if (body.jdText && body.jdText.trim() && body.jdText !== existing.jdText) {
      try {
        await parseJDAndPersist(id);
      } catch (parseError) {
        console.error("JD auto-parse failed:", parseError);
      }
    }

    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    if (user.role !== "admin") return forbidden();
    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) return notFound("Requirement");
    await prisma.requirement.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
