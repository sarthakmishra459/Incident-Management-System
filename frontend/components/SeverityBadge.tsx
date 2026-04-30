import clsx from "clsx";
import { Severity } from "../lib/api";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={clsx(
        "inline-flex h-6 min-w-10 items-center justify-center rounded px-2 text-xs font-semibold",
        severity === "P0" && "bg-red-100 text-danger",
        severity === "P1" && "bg-amber-100 text-warn",
        severity === "P2" && "bg-teal-100 text-accent"
      )}
    >
      {severity}
    </span>
  );
}
