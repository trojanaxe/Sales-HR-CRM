"use client";
import { useState } from "react";
import UsersPanel from "./UsersPanel";
import ContractModesPanel from "./ContractModesPanel";
import PipelineStagesPanel from "./PipelineStagesPanel";

type Tab = "users" | "contract-modes" | "pipeline-stages";

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("users");

  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: "Users" },
    { id: "contract-modes", label: "Contract Modes" },
    { id: "pipeline-stages", label: "Pipeline Stages" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Settings</h1>
        <p className="text-xs text-white/40 mt-1">Manage users, contract modes, and pipeline stages</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
            style={
              tab === t.id
                ? {
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "white",
                    boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
                  }
                : { color: "rgba(255,255,255,0.50)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersPanel />}
      {tab === "contract-modes" && <ContractModesPanel />}
      {tab === "pipeline-stages" && <PipelineStagesPanel />}
    </div>
  );
}
