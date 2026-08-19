"use client";

import { useState, useTransition } from "react";
import type { DealStage, SalesDeal } from "@/lib/database.types";
import { updateDealStage, convertDealToProject } from "@/lib/actions";

const STAGES: { key: DealStage; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "negotiating", label: "Negotiating" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export default function SalesKanban({ deals }: { deals: SalesDeal[] }) {
  const [items, setItems] = useState(deals);
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  function moveDeal(id: string, stage: DealStage) {
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    startTransition(() => {
      updateDealStage(id, stage).catch(() => {
        // revert on failure
        setItems(deals);
      });
    });
  }

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageDeals = items.filter((d) => d.stage === stage.key);
        return (
          <div
            key={stage.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragId && moveDeal(dragId, stage.key)}
            className="flex w-72 shrink-0 flex-col rounded-2xl border border-neutral-800 bg-neutral-900/60"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">{stage.label}</h3>
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                {stageDeals.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 p-3">
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={() => setDragId(deal.id)}
                  className="cursor-grab rounded-xl border border-neutral-800 bg-neutral-900 p-3 shadow-sm hover:border-neutral-700 active:cursor-grabbing"
                >
                  <p className="text-sm font-medium text-white">{deal.title}</p>
                  <p className="text-xs text-neutral-500">{deal.client_name}</p>
                  {deal.value > 0 && (
                    <p className="mt-1 text-xs text-emerald-400">
                      ${Number(deal.value).toLocaleString()}
                    </p>
                  )}
                  {stage.key === "won" && (
                    <form action={() => convertDealToProject(deal.id)}>
                      <button
                        type="submit"
                        className="mt-2 w-full rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        Convert to project →
                      </button>
                    </form>
                  )}
                </div>
              ))}
              {stageDeals.length === 0 && (
                <p className="px-1 py-2 text-xs text-neutral-600">Drop deals here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
