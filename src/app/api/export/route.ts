import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { unauthorized, serverError } from "@/lib/api";

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.map((k) => `"${k}"`).join(",");
  const body = rows.map((row) =>
    keys
      .map((k) => {
        const v = row[k];
        if (v === null || v === undefined) return '""';
        if (Array.isArray(v)) return `"${v.join("; ")}"`;
        return `"${String(v).replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...body].join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "requirements";

    let rows: Record<string, unknown>[] = [];
    let filename = "export.csv";

    if (type === "requirements") {
      const reqs = await prisma.requirement.findMany({
        where: user.role === "sales" ? { sdrId: user.id } : {},
        include: {
          sdr: { select: { name: true } },
          assignedHR: { select: { name: true } },
          contractMode: { select: { label: true } },
        },
        orderBy: { dateAdded: "desc" },
      });
      rows = reqs.map((r) => ({
        "Req ID": r.reqId,
        Status: r.status,
        Priority: r.priority,
        "Date Added": r.dateAdded.toISOString().split("T")[0],
        "Client Group": r.clientGroup,
        "Job Role": r.jobRole,
        SDR: r.sdr.name,
        "Assigned HR": r.assignedHR?.name || "",
        Vendor: r.vendor || "",
        "Contact Name": r.contactName || "",
        "Contact Email": r.contactEmail || "",
        "Contact Phone": r.contactPhone || "",
        Experience: r.experience || "",
        Budget: r.budget || "",
        Location: r.location || "",
        "Contract Mode": r.contractMode?.label || "",
        Industry: r.industry || "",
        "Closing Date": r.closingDate?.toISOString().split("T")[0] || "",
        "JD Received": r.jdReceived ? "Yes" : "No",
        "Won/Lost Reason": r.wonLostReason || "",
      }));
      filename = "requirements.csv";
    } else if (type === "candidates") {
      const cands = await prisma.candidate.findMany({
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      rows = cands.map((c) => ({
        "Candidate ID": c.candidateId,
        Name: c.name,
        Email: c.email || "",
        Phone: c.phone || "",
        LinkedIn: c.linkedIn || "",
        Location: c.currentLocation || "",
        "Willing to Relocate": c.willingToRelocate ? "Yes" : "No",
        Skills: c.skills.join("; "),
        Experience: c.experience ?? "",
        "Visa Status": c.visaStatus || "",
        Source: c.source,
        Owner: c.owner.name,
      }));
      filename = "candidates.csv";
    } else if (type === "pipeline") {
      const entries = await prisma.pipelineEntry.findMany({
        include: {
          candidate: { select: { name: true, candidateId: true } },
          requirement: { select: { reqId: true, clientGroup: true, jobRole: true } },
          stage: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      rows = entries.map((e) => ({
        "Candidate ID": e.candidate.candidateId,
        "Candidate Name": e.candidate.name,
        "Req ID": e.requirement.reqId,
        "Client Group": e.requirement.clientGroup,
        "Job Role": e.requirement.jobRole,
        Stage: e.stage.name,
        "Submission Date": e.submissionDate?.toISOString().split("T")[0] || "",
        "Offer Date": e.offerDate?.toISOString().split("T")[0] || "",
        "Placement Date": e.placementDate?.toISOString().split("T")[0] || "",
      }));
      filename = "pipeline.csv";
    }

    const csv = toCSV(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
