import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Prisma's `hasSome`/`hasEvery` on a String[] column only match an exact,
// case-sensitive array element — "Salesforce" never matches a stored
// "Salesforce CPQ", and "salesforce" never matches stored "Salesforce".
// That's the actual bug behind "Skills filter returns no results" and
// "Certification filter is not working": the UI/API plumbing was fine, the
// query itself couldn't do partial/case-insensitive matching against an
// array column. This does a per-element ILIKE via a raw query and returns
// the matching candidate ids, which the caller then folds into a normal
// Prisma `where: { id: { in: ... } }` alongside every other filter.
export async function candidateIdsMatchingArrayField(
  field: "skills" | "certifications",
  terms: string[],
  logic: "AND" | "OR"
): Promise<string[]> {
  if (terms.length === 0) return [];
  const column = field === "skills" ? Prisma.raw(`"skills"`) : Prisma.raw(`"certifications"`);
  const conditions = terms.map(
    (t) => Prisma.sql`EXISTS (SELECT 1 FROM unnest(${column}) elem WHERE elem ILIKE ${"%" + t + "%"})`
  );
  const combined = Prisma.join(conditions, logic === "AND" ? " AND " : " OR ");
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id FROM "Candidate" WHERE ${combined}`
  );
  return rows.map((r) => r.id);
}
