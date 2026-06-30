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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "users" && <UsersPanel />}
      {tab === "contract-modes" && <ContractModesPanel />}
      {tab === "pipeline-stages" && <PipelineStagesPanel />}
    </div>
  );
}
