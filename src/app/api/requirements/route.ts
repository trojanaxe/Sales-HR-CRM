import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { ok, error, unauthorized, validationError, serverError } from "@/lib/api";
import { nextReqId } from "@/lib/ids";
import { notifyNewRequirement } from "@/lib/slack";
import { parseJDAndPersist } from "@/lib/resume/service";
import { createAccount, findDuplicateAccounts, resolveOrCreateContact } from "@/lib/accounts/service";
import { validateRequirementFields, validateEnumFields } from "@/lib/requirements/validation";

const MAX_JD_TEXT_LENGTH = 20000;

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(req.url);

    const where: Record<string, unknown> = {};
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const clientGroup = searchParams.get("clientGroup");
    const assignedHRId = searchParams.get("assignedHRId");
    const unclaimed = searchParams.get("unclaimed");

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (clientGroup) where.clientGroup = { contains: clientGroup, mode: "insensitive" };
    if (unclaimed === "true") where.assignedHRId = null;
    if (assignedHRId) where.assignedHRId = assignedHRId;

    if (user.role === "sales") where.sdrId = user.id;

    const requirements = await prisma.requirement.findMany({
      where,
      include: {
        sdr: { select: { id: true, name: true } },
        assignedHR: { select: { id: true, name: true } },
        contractMode: { select: { id: true, label: true } },
        account: { select: { id: true, accountId: true, name: true } },
        contact: { select: { id: true, name: true } },
        collaborators: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { pipelineEntries: true, notes: true } },
      },
      orderBy: { dateAdded: "desc" },
    });

    return ok(requirements);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("sales", "admin");
    const body = await req.json();

    const {
      clientGroup, jobRole, priority, status, closingDate,
      vendor, contactName, contactRole, contactLinkedIn, contactEmail, contactPhone,
      experience, budget, location, contractModeId, industry, negotiable, workMode,
      meetingStatus, jdReceived, jdLink, jdText, wonLostReason,
      accountResolution,
    } = body;

    const merged = { ...body, priority: priority || "medium", status: status || "new" };
    const missingFields = validateRequirementFields(merged);
    if (missingFields.length > 0)
      return validationError(`Missing required field(s): ${missingFields.join(", ")}`, missingFields);

    const enumIssue = validateEnumFields(merged);
    if (enumIssue) return error(enumIssue);

    if (jdText && jdText.length > MAX_JD_TEXT_LENGTH)
      return error(`JD text is too long (max ${MAX_JD_TEXT_LENGTH.toLocaleString()} characters)`);

    // Account resolution: warn before silently creating a second Account for
    // a company that already exists (Part 2.5 of the CRM enhancement spec).
    let accountId: string;
    if (accountResolution?.action === "use_existing") {
      const existing = await prisma.account.findUnique({ where: { id: accountResolution.accountId } });
      if (!existing) return error("Selected existing account not found", 404);
      accountId = existing.id;
    } else if (accountResolution?.action === "create_new") {
      const created = await createAccount({ name: clientGroup, industry }, user.id);
      accountId = created.id;
    } else {
      const duplicates = await findDuplicateAccounts(clientGroup);
      if (duplicates.length > 0) {
        return ok({ status: "duplicate_account", duplicates }, 200);
      }
      const created = await createAccount({ name: clientGroup, industry }, user.id);
      accountId = created.id;
    }

    const contact = await resolveOrCreateContact(
      accountId,
      { name: contactName, role: contactRole, email: contactEmail, phone: contactPhone, linkedIn: contactLinkedIn },
      user.id
    );

    const reqId = await nextReqId();

    const requirement = await prisma.requirement.create({
      data: {
        reqId,
        sdrId: user.id,
        clientGroup,
        jobRole,
        priority: priority || "medium",
        status: status || "new",
        closingDate: closingDate ? new Date(closingDate) : undefined,
        vendor, contactName, contactRole, contactLinkedIn,
        contactEmail, contactPhone, experience, budget, location,
        contractModeId, industry, negotiable, workMode, meetingStatus,
        jdReceived: Boolean(jdReceived),
        jdLink, jdText, wonLostReason,
        accountId,
        contactId: contact?.id,
      },
      include: {
        sdr: { select: { id: true, name: true } },
        contractMode: true,
        account: { select: { id: true, accountId: true, name: true } },
        contact: { select: { id: true, name: true } },
      },
    });

    notifyNewRequirement({
      reqId: requirement.reqId,
      clientGroup: requirement.clientGroup,
      jobRole: requirement.jobRole,
      priority: requirement.priority,
      id: requirement.id,
    });

    // Best-effort: if the sales rep pasted JD text, extract required/preferred
    // skills right away so the requirement is immediately ready for matching.
    if (jdText && jdText.trim()) {
      try {
        await parseJDAndPersist(requirement.id);
      } catch (parseError) {
        console.error("JD auto-parse failed:", parseError);
      }
    }

    return ok(requirement, 201);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return unauthorized();
    return serverError(e);
  }
}
