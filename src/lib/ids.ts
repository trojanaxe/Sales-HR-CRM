import { prisma } from "./prisma";

export async function nextReqId(): Promise<string> {
  const count = await prisma.requirement.count();
  return `REQ-${String(count + 1).padStart(4, "0")}`;
}

export async function nextCandidateId(): Promise<string> {
  const count = await prisma.candidate.count();
  return `CAN-${String(count + 1).padStart(4, "0")}`;
}

export async function nextAccountId(): Promise<string> {
  const count = await prisma.account.count();
  return `ACC-${String(count + 1).padStart(4, "0")}`;
}
