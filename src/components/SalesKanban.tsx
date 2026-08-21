"use client";

import { useState, useTransition } from "react";
import type { DealStage, SalesDeal } from "@/lib/database.types";
import { updateDealStage, convertDealToProject } from "@/lib/actions";

const STAGES: { key: DealStage; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "contacted", label: "Sales Approached" },
  { key: "quoted", label: "Quoted" },
  { key: "negotiating", label: "Negotiating" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export default function SalesKanban({ deals }: { deals: SalesDeal[] }) {
  const [items, setItems] = useState(deals);
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);

  function moveDeal(id: string, stage: DealStage) {
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    startTransition(() => {
      updateDealStage(id, stage).catch(() => {
        // revert on failure
        setItems(deals);
      });
    });
  }

  const openDeal = items.find((d) => d.id === openDealId) ?? null;

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
                  onClick={() => setOpenDealId(deal.id)}
                  className="cursor-grab rounded-xl border border-neutral-800 bg-neutral-900 p-3 shadow-sm hover:border-neutral-700 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">{deal.title}</p>
                    {deal.fit_score != null && (
                      <span className="shrink-0 rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                        {deal.fit_score}/10
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">{deal.client_name}</p>
                  {deal.value > 0 && (
                    <p className="mt-1 text-xs text-emerald-400">
                      ${Number(deal.value).toLocaleString()}
                    </p>
                  )}
                  {deal.email_subject && (
                    <p className="mt-2 truncate text-xs text-neutral-400">
                      ✉ {deal.email_subject}
                    </p>
                  )}
                  {stage.key === "lead" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDeal(deal.id, "contacted");
                      }}
                      className="mt-2 w-full rounded-lg border border-neutral-700 px-2 py-1 text-xs font-medium text-neutral-300 hover:border-emerald-600 hover:text-emerald-400"
                    >
                      Mark as approached →
                    </button>
                  )}
                  {stage.key === "won" && (
                    <form
                      action={() => convertDealToProject(deal.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
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

      {openDeal && (
        <DealDetail deal={openDeal} onClose={() => setOpenDealId(null)} onMarkApproached={moveDeal} />
      )}
    </div>
  );
}

function DealDetail({
  deal,
  onClose,
  onMarkApproached,
}: {
  deal: SalesDeal;
  onClose: () => void;
  onMarkApproached: (id: string, stage: DealStage) => void;
}) {
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  function copy(field: "subject" | "body", text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">{deal.title}</h2>
            <p className="mt-0.5 text-sm text-neutral-400">
              {deal.client_name}
              {deal.role ? ` · ${deal.role}` : ""}
            </p>
            {deal.client_email && (
              <a
                href={`mailto:${deal.client_email}`}
                className="mt-1 inline-block text-sm text-indigo-400 hover:underline"
              >
                {deal.client_email}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-900 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {deal.industry && (
              <span className="rounded-full bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs text-neutral-300">
                {deal.industry}
              </span>
            )}
            {deal.fit_score != null && (
              <span className="rounded-full bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs text-neutral-300">
                Fit {deal.fit_score}/10
              </span>
            )}
          </div>

          {deal.problem_identified && (
            <Section label="Problem identified" text={deal.problem_identified} />
          )}
          {deal.video_opportunity && (
            <Section label="Video/animation opportunity" text={deal.video_opportunity} />
          )}
          {deal.outreach_angle && (
            <Section label="Personalized outreach angle" text={deal.outreach_angle} />
          )}

          {deal.email_subject && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Email subject
                </span>
                <button
                  type="button"
                  onClick={() => copy("subject", deal.email_subject ?? "")}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                >
                  {copied === "subject" ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <p className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white">
                {deal.email_subject}
              </p>
            </div>
          )}

          {deal.email_body && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Email body
                </span>
                <button
                  type="button"
                  onClick={() => copy("body", deal.email_body ?? "")}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                >
                  {copied === "body" ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <p className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm leading-relaxed text-neutral-200">
                {deal.email_body}
              </p>
            </div>
          )}

          {!deal.email_subject && !deal.email_body && (
            <p className="text-sm text-neutral-500">
              No drafted email on this deal — it was likely added by hand rather than by the
              lead-research automation.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-3">
          {deal.stage === "lead" && (
            <button
              type="button"
              onClick={() => {
                onMarkApproached(deal.id, "contacted");
                onClose();
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Mark as approached
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm leading-relaxed text-neutral-300">{text}</p>
    </div>
  );
}
