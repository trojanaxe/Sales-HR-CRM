// One-off backfill: derive Account/Contact records from the free-text
// clientGroup/contact* fields already on existing Requirement rows, so
// "Total Requirements" counts on the new Accounts module are correct for
// historical data, not just requirements created after this feature shipped.
// Safe to re-run: only touches requirements where accountId is still null.
import { prisma } from "../src/lib/prisma";
import { createAccount, findDuplicateAccounts, normalizeAccountName, resolveOrCreateContact } from "../src/lib/accounts/service";

async function main() {
  const requirements = await prisma.requirement.findMany({
    where: { accountId: null },
    orderBy: { dateAdded: "asc" },
  });

  console.log(`Found ${requirements.length} requirement(s) to backfill.`);

  const accountByNormalizedName = new Map<string, string>();
  for (const acc of await prisma.account.findMany()) {
    accountByNormalizedName.set(acc.normalizedName, acc.id);
  }

  let accountsCreated = 0;
  let contactsResolved = 0;

  for (const req of requirements) {
    if (!req.clientGroup?.trim()) continue;
    const normalized = normalizeAccountName(req.clientGroup);

    let accountId = accountByNormalizedName.get(normalized);
    if (!accountId) {
      // Reuse an existing account if a confident duplicate already exists
      // (e.g. two requirements for "ABC Corp" / "Abc Corp." created before
      // normalization was consistent); otherwise create fresh.
      const dup = (await findDuplicateAccounts(req.clientGroup)).find((d) => d.reasons.includes("exact_name"));
      if (dup) {
        accountId = dup.id;
      } else {
        const created = await createAccount({ name: req.clientGroup, industry: req.industry }, req.sdrId);
        accountId = created.id;
        accountsCreated++;
      }
      accountByNormalizedName.set(normalized, accountId);
    }

    let contactId: string | undefined;
    if (req.contactName || req.contactEmail) {
      const contact = await resolveOrCreateContact(
        accountId,
        { name: req.contactName, role: req.contactRole, email: req.contactEmail, phone: req.contactPhone, linkedIn: req.contactLinkedIn },
        req.sdrId
      );
      contactId = contact?.id;
      if (contact) contactsResolved++;
    }

    await prisma.requirement.update({ where: { id: req.id }, data: { accountId, contactId } });
  }

  console.log(`Done. Accounts created: ${accountsCreated}. Contacts resolved/created: ${contactsResolved}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
