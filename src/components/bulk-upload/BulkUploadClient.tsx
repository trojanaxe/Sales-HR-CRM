"use client";
import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { SCHEMAS, UploadType, ColumnDef } from "@/lib/bulk-upload-schema";

type Row = Record<string, string>;

interface ParsedRow {
  index: number;
  data: Row;
  errors: string[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-/()]+/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  clientgroup: "clientGroup",
  client: "clientGroup",
  company: "clientGroup",
  jobrole: "jobRole",
  role: "jobRole",
  jobtitle: "jobRole",
  title: "jobRole",
  contractmode: "contractMode",
  contract: "contractMode",
  contactname: "contactName",
  contactemail: "contactEmail",
  contactphone: "contactPhone",
  jdlink: "jdLink",
  jdurl: "jdLink",
  fullname: "name",
  candidatename: "name",
  firstname: "name",
  location: "currentLocation",
  currentlocation: "currentLocation",
  city: "currentLocation",
  experienceyears: "experience",
  exp: "experience",
  visa: "visaStatus",
  visastatus: "visaStatus",
  willingtorelocate: "willingToRelocate",
  relocate: "willingToRelocate",
  linkedin: "linkedIn",
  linkedinurl: "linkedIn",
};

function resolveHeader(raw: string): string {
  const n = normalizeHeader(raw);
  return HEADER_ALIASES[n] ?? n;
}

async function parseFile(file: File): Promise<Row[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const text = await file.text();
    return parseCSV(text);
  }
  if (ext === "xlsx" || ext === "xls") {
    const { read, utils } = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: string[][] = utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (raw.length < 2) return [];
    const headers = (raw[0] as string[]).map(resolveHeader);
    return raw.slice(1).map((r) => {
      const row: Row = {};
      headers.forEach((h, i) => { row[h] = String(r[i] ?? "").trim(); });
      return row;
    });
  }
  throw new Error("Unsupported file format. Use .csv, .xlsx, or .xls");
}

function parseCSV(text: string): Row[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }
  const headers = splitLine(lines[0]).map(resolveHeader);
  return lines.slice(1).map((line) => {
    const vals = splitLine(line);
    const row: Row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").replace(/^"|"$/g, "").trim(); });
    return row;
  });
}

function validateRows(rows: Row[], schema: ColumnDef[]): ParsedRow[] {
  return rows.map((data, index) => {
    const errors: string[] = [];
    schema.filter((c) => c.required).forEach((c) => {
      if (!data[c.key]?.trim()) errors.push(`${c.label} is required`);
    });
    return { index, data, errors };
  });
}

function downloadSample(type: UploadType) {
  const schema = SCHEMAS[type];
  const headers = schema.map((c) => c.label).join(",");
  const exampleRows =
    type === "candidates"
      ? [
          "John Smith,john@email.com,+1-555-0101,Austin TX,7,\"Salesforce, CPQ, Apex\",Green Card,linkedin,yes,https://linkedin.com/in/johnsmith",
          "Sarah Johnson,sarah@email.com,+1-555-0102,Remote,5,\"Java, Spring Boot\",H1B,referral,no,",
        ]
      : [
          "TechCorp,Salesforce Developer,high,open,C2C,Austin TX,5-8 years,$80-95/hr,VendorX,IT,,contact@techcorp.com,+1-555-0200,",
          "FinanceHub,Java Backend Engineer,medium,open,W2,Remote,3+ years,$70-85/hr,,,Jane Doe,jane@financehub.com,+1-555-0201,https://jd.example.com/123",
        ];
  const csv = [headers, ...exampleRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sample-${type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── component ─────────────────────────────────────────────────────────────────

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const inputCls = "glass-input px-3 py-2 text-sm";

export default function BulkUploadClient({ userRole }: { userRole: string }) {
  const [type, setType] = useState<UploadType>("candidates");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const schema = SCHEMAS[type];
  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);
  const allValidSelected = validRows.every((r) => selectedRows.has(r.index));

  function toggleAll() {
    if (allValidSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(validRows.map((r) => r.index)));
  }

  function toggleRow(index: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  async function handleFile(file: File) {
    setResult(null);
    setRows([]);
    setSelectedRows(new Set());
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) { toast.error("No data rows found in file"); return; }
      const validated = validateRows(parsed, schema);
      setFileName(file.name);
      setRows(validated);
      setSelectedRows(new Set(validated.filter((r) => r.errors.length === 0).map((r) => r.index)));
      toast.success(`Parsed ${parsed.length} rows`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to parse file");
    }
  }

  async function upload() {
    const toUpload = rows.filter((r) => selectedRows.has(r.index) && r.errors.length === 0);
    if (toUpload.length === 0) { toast.error("No valid rows selected"); return; }
    setUploading(true);
    setResult(null);
    try {
      const res = await fetch("/api/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, rows: toUpload.map((r) => r.data) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Upload failed"); return; }
      setResult(data);
      toast.success(`${data.created} records created`);
    } catch {
      toast.error("Network error");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setRows([]);
    setFileName("");
    setResult(null);
    setSelectedRows(new Set());
    if (fileRef.current) fileRef.current.value = "";
  }

  const canUpload = userRole === "admin" || (type === "candidates" && userRole === "hr");

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Bulk Upload</h1>
        <p className="text-sm text-white/40 mt-1">Import multiple records from a CSV or Excel file.</p>
      </div>

      {/* Config card */}
      <div className="rounded-2xl p-6 space-y-5" style={glassStyle}>
        <div className="flex flex-wrap gap-6 items-end">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Import Type</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value as UploadType); reset(); }}
              className={`${inputCls} w-44`}
            >
              {userRole !== "sales" && <option value="candidates">Candidates</option>}
              {(userRole === "admin" || userRole === "sales") && <option value="requirements">Requirements</option>}
            </select>
          </div>

          {/* Sample download */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Sample File</label>
            <button
              onClick={() => downloadSample(type)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white flex items-center gap-2 transition-all duration-200 cursor-pointer"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Sample
            </button>
            <p className="text-xs text-white/30 mt-1.5">CSV with example rows</p>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Upload File</label>
            <div className="flex gap-2 items-center">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all duration-200 cursor-pointer"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Choose File
              </button>
              {fileName && <span className="text-sm text-white/60 truncate max-w-xs">{fileName}</span>}
            </div>
            <p className="text-xs text-white/30 mt-1.5">Supports .csv, .xlsx, .xls</p>
          </div>

          {rows.length > 0 && (
            <button
              onClick={reset}
              className="px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 transition-all duration-200 cursor-pointer"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Column guide */}
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2.5">
            Expected columns for <span className="text-indigo-400">{type}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {schema.map((col) => (
              <span
                key={col.key}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${col.required ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-white/[0.06] text-white/50 border border-white/10"}`}
                title={col.hint}
              >
                {col.label}{col.required ? " *" : ""}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-2">
            <span className="text-indigo-400 font-medium">Indigo = required.</span> Column names are flexible — &quot;Full Name&quot;, &quot;name&quot;, &quot;Candidate Name&quot; all work.
          </p>
        </div>
      </div>

      {/* Upload result banner */}
      {result && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: result.failed === 0 ? "rgba(52,211,153,0.10)" : "rgba(245,158,11,0.10)",
            border: result.failed === 0 ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <p className="text-sm font-semibold text-white">
            {result.failed === 0 ? "✓" : "⚠"} {result.created} records created
            {result.failed > 0 ? ` · ${result.failed} failed` : ""}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-rose-400">{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="space-y-3">
          {/* Stats bar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="text-white/50">{rows.length} rows parsed</span>
              <span className="text-emerald-400 font-semibold">{validRows.length} valid</span>
              {invalidRows.length > 0 && <span className="text-rose-400 font-semibold">{invalidRows.length} with errors</span>}
              <span className="text-indigo-400 font-semibold">{selectedRows.size} selected</span>
            </div>
            {canUpload && (
              <button
                onClick={upload}
                disabled={uploading || selectedRows.size === 0}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                }}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload {selectedRows.size} Record{selectedRows.size !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={glassStyle}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allValidSelected && validRows.length > 0}
                        onChange={toggleAll}
                        className="rounded accent-indigo-500"
                        title="Select all valid rows"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-widest">#</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-widest">Status</th>
                    {schema.map((col) => (
                      <th key={col.key} className="px-3 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">
                        {col.label}{col.required ? " *" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const hasError = row.errors.length > 0;
                    const isSelected = selectedRows.has(row.index);
                    return (
                      <tr
                        key={row.index}
                        style={{
                          background: hasError
                            ? "rgba(244,63,94,0.06)"
                            : isSelected
                            ? "rgba(99,102,241,0.08)"
                            : undefined,
                          borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                        }}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={hasError}
                            onChange={() => toggleRow(row.index)}
                            className="rounded accent-indigo-500 disabled:opacity-30"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-white/30 text-xs">{row.index + 1}</td>
                        <td className="px-3 py-2.5">
                          {hasError ? (
                            <span title={row.errors.join(", ")} className="text-xs text-rose-400 cursor-help">
                              ⚠ {row.errors[0]}{row.errors.length > 1 ? ` +${row.errors.length - 1}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-400 font-medium">✓ Valid</span>
                          )}
                        </td>
                        {schema.map((col) => (
                          <td key={col.key} className="px-3 py-2.5 text-white/70 whitespace-nowrap max-w-[180px] truncate">
                            {row.data[col.key] || <span className="text-white/20">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {!canUpload && (
            <p className="text-sm text-amber-400/80">
              Your role ({userRole}) cannot import {type}. Contact an admin.
            </p>
          )}
        </div>
      )}

      {/* Empty state / drop zone */}
      {rows.length === 0 && !fileName && (
        <div
          className="rounded-2xl p-14 text-center cursor-pointer transition-all duration-200"
          style={{
            border: "2px dashed rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.03)",
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
            e.currentTarget.style.background = "rgba(99,102,241,0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white/70">Drop your CSV or Excel file here</p>
          <p className="text-xs text-white/30 mt-1.5">or click to browse · .csv, .xlsx, .xls</p>
        </div>
      )}
    </div>
  );
}
