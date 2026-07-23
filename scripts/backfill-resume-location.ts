// One-off: re-run resume parsing for every active resume now that location
// extraction exists, so candidates uploaded before this fix can still be
// found by the Location filter if their resume has an explicit label.
import { prisma } from "../src/lib/prisma";
import { parseResumeAndPersist } from "../src/lib/resume/service";

async function main() {
  const resumes = await prisma.resume.findMany({ where: { isActive: true } });
  let found = 0;
  for (const r of resumes) {
    try {
      await parseResumeAndPersist(r.id);
      const profile = await prisma.resumeProfile.findUnique({ where: { resumeId: r.id } });
      if (profile?.location) found++;
    } catch (e) {
      console.error(`Failed to re-parse resume ${r.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Re-parsed ${resumes.length} active resumes; ${found} now have a location on file.`);
}
main().finally(() => prisma.$disconnect());
