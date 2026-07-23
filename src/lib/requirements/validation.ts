// Part 1.4 of the CRM enhancement request: every New Requirement field is
// mandatory except Job URL (jdLink) and Job Description (jdText). Kept as
// a single shared list so the API (defense-in-depth) and the form's inline
// validation (src/components/requirements/RequirementForm.tsx) can't drift.
export const REQUIRED_REQUIREMENT_FIELDS: { key: string; label: string }[] = [
  { key: "clientGroup", label: "Client Group" },
  { key: "jobRole", label: "Job Role" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "vendor", label: "Vendor / Company" },
  { key: "location", label: "Location" },
  { key: "experience", label: "Experience" },
  { key: "budget", label: "Budget / Rate" },
  { key: "contractModeId", label: "Contract Mode" },
  { key: "industry", label: "Industry" },
  { key: "closingDate", label: "Closing Date" },
  { key: "meetingStatus", label: "Meeting Status" },
  { key: "contactName", label: "Contact Name" },
  { key: "contactRole", label: "Contact Role" },
  { key: "contactEmail", label: "Contact Email" },
  { key: "contactPhone", label: "Contact Phone" },
  { key: "contactLinkedIn", label: "Contact LinkedIn" },
  { key: "negotiable", label: "Negotiable" },
  { key: "workMode", label: "Work Mode" },
];

export const MEETING_STATUS_OPTIONS = ["SDR Intro", "Manager Intro"] as const;
export const NEGOTIABLE_OPTIONS = ["yes", "no", "maybe"] as const;
export const WORK_MODE_OPTIONS = ["onsite", "remote", "hybrid"] as const;

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

export function validateRequirementFields(merged: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const f of REQUIRED_REQUIREMENT_FIELDS) {
    if (isEmpty(merged[f.key])) missing.push(f.label);
  }
  if ((merged.status === "closed_won" || merged.status === "closed_lost") && isEmpty(merged.wonLostReason)) {
    missing.push("Won / Lost Reason");
  }
  return missing;
}

export function validateEnumFields(merged: Record<string, unknown>): string | null {
  if (!isEmpty(merged.meetingStatus) && !MEETING_STATUS_OPTIONS.includes(merged.meetingStatus as never)) {
    return `Meeting Status must be one of: ${MEETING_STATUS_OPTIONS.join(", ")}`;
  }
  if (!isEmpty(merged.negotiable) && !NEGOTIABLE_OPTIONS.includes(merged.negotiable as never)) {
    return `Negotiable must be one of: ${NEGOTIABLE_OPTIONS.join(", ")}`;
  }
  if (!isEmpty(merged.workMode) && !WORK_MODE_OPTIONS.includes(merged.workMode as never)) {
    return `Work Mode must be one of: ${WORK_MODE_OPTIONS.join(", ")}`;
  }
  return null;
}
