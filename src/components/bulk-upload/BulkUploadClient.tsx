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
  // requirements
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
  // candidates
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

// ── component ─────────────────────────────────────────────────────────────────

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
    if (allValidSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(validRows.map((r) => r.index)));
    }
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
      // auto-select all valid rows
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
        <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
        <p className="text-sm text-gray-500 mt-1">Import multiple records from a CSV or Excel file.</p>
      </div>

      {/* Config card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap gap-6 items-end">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Import type</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value as UploadType); reset(); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {userRole !== "sales" && <option value="candidates">Candidates</option>}
              {(userRole === "admin" || userRole === "sales") && <option value="requirements">Requirements</option>}
            </select>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload file</label>
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
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <span>📂</span> Choose File
              </button>
              {fileName && <span className="text-sm text-gray-600 truncate max-w-xs">{fileName}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-1">Supports .csv, .xlsx, .xls</p>
          </div>

          {rows.length > 0 && (
            <button onClick={reset} className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
              Clear
            </button>
          )}
        </div>

        {/* Template / column guide */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Expected columns for <span className="text-blue-600">{type}</span></p>
          <div className="flex flex-wrap gap-2">
            {schema.map((col) => (
              <span
                key={col.key}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${col.required ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                title={col.hint}
              >
                {col.label}{col.required ? " *" : ""}
                {col.hint && <span className="ml-1 opacity-60">ℹ</span>}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            <span className="text-blue-600 font-medium">Blue = required.</span> Column names are flexible — &quot;Full Name&quot;, &quot;Candidate Name&quot;, &quot;name&quot; all work.
          </p>
        </div>
      </div>

      {/* Upload result banner */}
      {result && (
        <div className={`rounded-xl p-4 border ${result.failed === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <p className="text-sm font-semibold text-gray-800">
            ✅ {result.created} records created{result.failed > 0 ? ` · ⚠️ ${result.failed} failed` : ""}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-red-600">{e}</li>
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
            <div className="flex gap-4 text-sm">
              <span className="text-gray-600">{rows.length} rows parsed</span>
              <span className="text-green-600 font-medium">{validRows.length} valid</span>
              {invalidRows.length > 0 && <span className="text-red-600 font-medium">{invalidRows.length} with errors</span>}
              <span className="text-blue-600 font-medium">{selectedRows.size} selected</span>
            </div>
            {canUpload && (
              <button
                onClick={upload}
                disabled={uploading || selectedRows.size === 0}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
              >
                {uploading ? (
                  <><span className="animate-spin">⟳</span> Uploading…</>
                ) : (
                  <>⬆ Upload {selectedRows.size} Record{selectedRows.size !== 1 ? "s" : ""}</>
                )}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allValidSelected && validRows.length > 0}
                        onChange={toggleAll}
                        className="rounded"
                        title="Select all valid rows"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    {schema.map((col) => (
                      <th key={col.key} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {col.label}{col.required ? " *" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const hasError = row.errors.length > 0;
                    const isSelected = selectedRows.has(row.index);
                    return (
                      <tr
                        key={row.index}
                        className={`${hasError ? "bg-red-50" : isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={hasError}
                            onChange={() => toggleRow(row.index)}
                            className="rounded disabled:opacity-30"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-gray-400 text-xs">{row.index + 1}</td>
                        <td className="px-3 py-2.5">
                          {hasError ? (
                            <span title={row.errors.join(", ")} className="text-xs text-red-600 cursor-help">
                              ⚠ {row.errors[0]}{row.errors.length > 1 ? ` +${row.errors.length - 1}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600">✓ Valid</span>
                          )}
                        </td>
                        {schema.map((col) => (
                          <td key={col.key} className="px-3 py-2.5 text-gray-700 whitespace-nowrap max-w-[180px] truncate">
                            {row.data[col.key] || <span className="text-gray-300">—</span>}
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
            <p className="text-sm text-orange-600">
              Your role ({userRole}) cannot import {type}. Contact an admin.
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && !fileName && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm font-medium text-gray-700">Drop your CSV or Excel file here</p>
          <p className="text-xs text-gray-400 mt-1">or click to browse</p>
        </div>
      )}
    </div>
  );
}
