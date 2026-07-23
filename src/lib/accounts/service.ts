import { prisma } from "@/lib/prisma";
import { nextAccountId } from "@/lib/ids";
import type { Account, Contact } from "@prisma/client";

export function normalizeAccountName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,]+$/g, "");
}

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export type AccountDuplicateReason = "domain" | "exact_name" | "similar_name";

export interface AccountDuplicateMatch {
  id: string;
  accountId: string;
  name: string;
  domain: string | null;
  website: string | null;
  reasons: AccountDuplicateReason[];
}

// Same "never silently create, let the user confirm" shape as
// findDuplicateCandidates in src/lib/resume/duplicateDetection.ts — kept
// deliberately conservative (fetch a bounded recent set for the fuzzy pass)
// since this CRM's account volume is expected to stay in the hundreds/low
// thousands, not requiring a full-text search index.
export async function findDuplicateAccounts(
  name: string,
  domain?: string | null
): Promise<AccountDuplicateMatch[]> {
  const normalized = normalizeAccountName(name);
  const matches = new Map<string, AccountDuplicateMatch>();

  const addMatch = (a: Pick<Account, "id" | "accountId" | "name" | "domain" | "website">, reason: AccountDuplicateReason) => {
    const existing = matches.get(a.id);
    if (existing) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    } else {
      matches.set(a.id, { id: a.id, accountId: a.accountId, name: a.name, domain: a.domain, website: a.website, reasons: [reason] });
    }
  };

  if (domain) {
    const normalizedDomain = normalizeDomain(domain);
    if (normalizedDomain) {
      const domainMatches = await prisma.account.findMany({ where: { domain: normalizedDomain } });
      domainMatches.forEach((a) => addMatch(a, "domain"));
    }
  }

  if (normalized) {
    const exact = await prisma.account.findMany({ where: { normalizedName: normalized } });
    exact.forEach((a) => addMatch(a, "exact_name"));

    if (normalized.length >= 3) {
      const candidatePool = await prisma.account.findMany({
        select: { id: true, accountId: true, name: true, domain: true, website: true, normalizedName: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      for (const a of candidatePool) {
        if (matches.has(a.id)) continue;
        if (a.normalizedName.includes(normalized) || normalized.includes(a.normalizedName)) {
          addMatch(a, "similar_name");
        }
      }
    }
  }

  return Array.from(matches.values());
}

export interface CreateAccountInput {
  name: string;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
}

export async function createAccount(input: CreateAccountInput, createdById: string): Promise<Account> {
  const accountId = await nextAccountId();
  const domain = input.domain ? normalizeDomain(input.domain) : null;
  return prisma.account.create({
    data: {
      accountId,
      name: input.name.trim(),
      normalizedName: normalizeAccountName(input.name),
      domain: domain || null,
      website: input.website?.trim() || null,
      industry: input.industry?.trim() || null,
      notes: input.notes?.trim() || null,
      createdById,
    },
  });
}

export interface ResolveContactInput {
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedIn?: string | null;
}

// Contacts don't get the confirm-before-create treatment Accounts do — the
// spec only asks that a second prospect from the same company link to the
// existing Account, not that every re-entry of the same contact needs a
// prompt. So this silently reuses a match (by email, else exact name) within
// the account and fills gaps, matching the non-destructive "sync" pattern
// used for Candidate fields in resume/service.ts.
export async function resolveOrCreateContact(
  accountId: string,
  input: ResolveContactInput,
  createdById: string
): Promise<Contact | null> {
  if (!input.name && !input.email) return null;

  let existing: Contact | null = null;
  if (input.email) {
    existing = await prisma.contact.findFirst({ where: { accountId, email: { equals: input.email.trim(), mode: "insensitive" } } });
  }
  if (!existing && input.name) {
    existing = await prisma.contact.findFirst({ where: { accountId, name: { equals: input.name.trim(), mode: "insensitive" } } });
  }

  if (existing) {
    const data: Record<string, string> = {};
    if (!existing.role && input.role) data.role = input.role;
    if (!existing.email && input.email) data.email = input.email;
    if (!existing.phone && input.phone) data.phone = input.phone;
    if (!existing.linkedIn && input.linkedIn) data.linkedIn = input.linkedIn;
    if (Object.keys(data).length === 0) return existing;
    return prisma.contact.update({ where: { id: existing.id }, data });
  }

  return prisma.contact.create({
    data: {
      accountId,
      name: (input.name || "Unknown Contact").trim(),
      role: input.role?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      linkedIn: input.linkedIn?.trim() || null,
      createdById,
    },
  });
}
