import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { ok, error, unauthorized, serverError } from "@/lib/api";
import { nextCandidateId } from "@/lib/ids";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);

    const skills = searchParams.getAll("skill");
    const skillLogic = searchParams.get("skillLogic") || "AND";
    const minExp = searchParams.get("minExp");
    const maxExp = searchParams.get("maxExp");
    const location = searchParams.get("location");
    const search = searchParams.get("search");
    const source = searchParams.get("source");
    const visaStatus = searchParams.get("visaStatus");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (source) where.source = source;
    if (visaStatus) where.visaStatus = { contains: visaStatus, mode: "insensitive" };
    if (location) where.currentLocation = { contains: location, mode: "insensitive" };
    if (minExp) where.experience = { ...(where.experience as object || {}), gte: parseFloat(minExp) };
    if (maxExp) where.experience = { ...(where.experience as object || {}), lte: parseFloat(maxExp) };

    if (skills.length > 0) {
      if (skillLogic === "AND") {
        where.skills = { hasEvery: skills };
      } else {
        where.skills = { hasSome: skills };
      }
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
      skills, experience, visaStatus, source,
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
