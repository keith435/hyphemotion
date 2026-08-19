"use client";

import { useState, useTransition } from "react";
import { createDeal } from "@/lib/actions";

export default function NewDealForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createDeal(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        + New deal
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">New deal</h2>
            <form action={handleSubmit} className="space-y-3">
              <Field label="Deal title" name="title" required placeholder="60s brand explainer" />
              <Field label="Client name" name="client_name" required placeholder="Acme Inc." />
              <Field label="Client email" name="client_email" type="email" placeholder="contact@acme.com" />
              <Field label="Client company" name="client_company" placeholder="Acme Inc." />
              <Field label="Estimated value ($)" name="value" type="number" placeholder="5000" />
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-400">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {pending ? "Creating..." : "Create deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-400">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
      />
    </div>
  );
}
