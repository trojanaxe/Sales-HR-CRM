import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { ok, error, unauthorized, serverError } from "@/lib/api";
import { nextCandidateId } from "@/lib/ids";
import { candidateIdsMatchingArrayField } from "@/lib/candidates/filters";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);

    const skills = searchParams.getAll("skill");
    const skillLogic = searchParams.get("skillLogic") || "AND";
    const certifications = searchParams.getAll("certification");
    const minExp = searchParams.get("minExp");
    const maxExp = searchParams.get("maxExp");
    const location = searchParams.get("location");
    const search = searchParams.get("search");
    const jobTitle = searchParams.get("jobTitle");
    const noticePeriod = searchParams.get("noticePeriod");
    const source = searchParams.get("source");
    const sourceDetail = searchParams.get("sourceDetail");
    const visaStatus = searchParams.get("visaStatus");
    const uploadedBy = searchParams.get("uploadedBy");
    const uploadedByName = searchParams.get("uploadedByName");
    const uploadedFrom = searchParams.get("uploadedFrom");
    const uploadedTo = searchParams.get("uploadedTo");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (source) where.source = source;
    if (sourceDetail) where.sourceDetail = { contains: sourceDetail, mode: "insensitive" };
    if (visaStatus) where.visaStatus = { contains: visaStatus, mode: "insensitive" };
    if (location) where.currentLocation = { contains: location, mode: "insensitive" };
    if (jobTitle) where.currentJobTitle = { contains: jobTitle, mode: "insensitive" };
    if (noticePeriod) where.noticePeriod = { contains: noticePeriod, mode: "insensitive" };
    if (uploadedBy) where.ownerId = uploadedBy;
    if (uploadedByName) where.owner = { name: { contains: uploadedByName, mode: "insensitive" } };
    if (minExp) where.experience = { ...(where.experience as object || {}), gte: parseFloat(minExp) };
    if (maxExp) where.experience = { ...(where.experience as object || {}), lte: parseFloat(maxExp) };

    let skillMatchIds: string[] | null = null;
    if (skills.length > 0) {
      skillMatchIds = await candidateIdsMatchingArrayField("skills", skills, skillLogic === "AND" ? "AND" : "OR");
    }
    let certMatchIds: string[] | null = null;
    if (certifications.length > 0) {
      certMatchIds = await candidateIdsMatchingArrayField("certifications", certifications, "OR");
    }
    if (skillMatchIds !== null || certMatchIds !== null) {
      let ids = skillMatchIds ?? certMatchIds ?? [];
      if (skillMatchIds !== null && certMatchIds !== null) {
        const certSet = new Set(certMatchIds);
        ids = skillMatchIds.filter((id) => certSet.has(id));
      }
      where.id = { in: ids };
    }

    if (uploadedFrom || uploadedTo) {
      where.resumes = {
        some: {
          isActive: true,
          uploadedAt: {
            ...(uploadedFrom ? { gte: new Date(uploadedFrom) } : {}),
            ...(uploadedTo ? { lte: new Date(uploadedTo) } : {}),
          },
        },
      };
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        resumes: { where: { isActive: true }, orderBy: { uploadedAt: "desc" }, take: 1 },
        _count: { select: { pipelineEntries: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(candidates);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("hr", "admin");
    const body = await req.json();

    const {
      name, email, phone, linkedIn, currentLocation, willingToRelocate,
      skills, experience, visaStatus, source, sourceDetail,
      currentJobTitle, noticePeriod, currentCTC, expectedCTC,
    } = body;

    if (!name) return error("name is required");

    const candidateId = await nextCandidateId();

    const candidate = await prisma.candidate.create({
      data: {
        candidateId,
        name, email, phone, linkedIn,
        currentLocation,
        willingToRelocate: Boolean(willingToRelocate),
        skills: skills || [],
        experience: experience ? parseFloat(experience) : undefined,
        visaStatus,
        source: source || "external",
        sourceDetail,
        currentJobTitle, noticePeriod, currentCTC, expectedCTC,
        ownerId: user.id,
      },
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    return ok(candidate, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
