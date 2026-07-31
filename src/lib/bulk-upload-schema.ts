export type UploadType = "requirements" | "candidates";

export interface ColumnDef {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

export const SCHEMAS: Record<UploadType, ColumnDef[]> = {
  requirements: [
    { key: "clientGroup",   label: "Client Group",         required: true },
    { key: "jobRole",       label: "Job Role",             required: true },
    { key: "priority",      label: "Priority",             required: false, hint: "high / medium / low" },
    { key: "status",        label: "Status",               required: false, hint: "new / in_progress / on_hold / closed_won / closed_lost" },
    { key: "contractMode",  label: "Contract Mode",        required: false, hint: "C2C / W2 / C2H" },
    { key: "location",      label: "Location",             required: false },
    { key: "experience",    label: "Experience",           required: false, hint: "e.g. 5-8 years" },
    { key: "budget",        label: "Budget / Rate",        required: false },
    { key: "vendor",        label: "Vendor",               required: false },
    { key: "industry",      label: "Industry",             required: false },
    { key: "contactName",   label: "Contact Name",         required: false },
    { key: "contactEmail",  label: "Contact Email",        required: false },
    { key: "contactPhone",  label: "Contact Phone",        required: false },
    { key: "jdLink",        label: "JD Link",              required: false },
  ],
  candidates: [
    { key: "name",              label: "Full Name",            required: true },
    { key: "email",             label: "Email",                required: false },
    { key: "phone",             label: "Phone",                required: false },
    { key: "currentLocation",   label: "Location",             required: false },
    { key: "experience",        label: "Experience (years)",   required: false },
    { key: "skills",            label: "Skills",               required: false, hint: "comma-separated: Java, AWS" },
    { key: "visaStatus",        label: "Visa Status",          required: false },
    { key: "source",            label: "Source",               required: false, hint: "linkedin / referral / indeed / internal / external" },
    { key: "willingToRelocate", label: "Willing to Relocate",  required: false, hint: "yes / no" },
    { key: "linkedIn",          label: "LinkedIn URL",         required: false },
  ],
};
