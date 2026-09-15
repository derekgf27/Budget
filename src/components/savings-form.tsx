"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertSavings } from "@/app/actions";
import {
  Field,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

type SavingsFormProps = {
  initial?: {
    id?: string;
    name?: string;
    kind?: "goal" | "fund";
    target?: string;
    current?: string;
    contribution?: string;
  };
  /** Lock kind when creating from a specific button */
  forcedKind?: "goal" | "fund";
  submitLabel?: string;
  onSuccess?: () => void;
};

export function SavingsForm({
  initial,
  forcedKind,
  submitLabel,
  onSuccess,
}: SavingsFormProps) {
  const router = useRouter();
  const [kind, setKind] = useState<"goal" | "fund">(
    forcedKind || initial?.kind || "goal",
  );

  async function save(formData: FormData) {
    await upsertSavings(formData);
    onSuccess?.();
    router.refresh();
  }

  const isFund = kind === "fund";
  const label =
    submitLabel || (isFund ? "Save fund" : "Save goal");

  return (
    <form action={save} className="grid gap-3">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="kind" value={kind} />

      {!forcedKind && !initial?.id ? (
        <Field label="Type">
          <select
            className={inputClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as "goal" | "fund")}
          >
            <option value="goal">Goal (target + planned deposits)</option>
            <option value="fund">Fund (add any amount anytime)</option>
          </select>
        </Field>
      ) : null}

      <Field label="Name">
        <input
          name="name"
          required
          className={inputClass}
          placeholder={isFund ? "General savings" : "Emergency fund"}
          defaultValue={initial?.name}
        />
      </Field>

      {isFund ? (
        <Field label="Starting balance ($) — optional">
          <input
            name="current"
            className={inputClass}
            placeholder="0"
            defaultValue={initial?.current ?? "0"}
          />
        </Field>
      ) : (
        <>
          <Field label="Target ($)">
            <input
              name="target"
              required
              className={inputClass}
              placeholder="10000"
              defaultValue={initial?.target}
            />
          </Field>
          <Field label="Current ($)">
            <input
              name="current"
              className={inputClass}
              placeholder="0"
              defaultValue={initial?.current ?? "0"}
            />
          </Field>
          <Field label="Contribution each check-in ($)">
            <input
              name="contribution"
              required
              className={inputClass}
              placeholder="250"
              defaultValue={initial?.contribution}
            />
          </Field>
        </>
      )}

      <button type="submit" className={buttonPrimaryClass}>
        {label}
      </button>
    </form>
  );
}
