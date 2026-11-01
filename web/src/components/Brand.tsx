import { useId } from "react";

/** Glossy aqua orb with a rising check — the Trustworthy mark. */
export function BrandMark({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <defs>
        <radialGradient id={`${id}g`} cx="40%" cy="30%" r="75%">
          <stop offset="0" stopColor="#9BF0FF" />
          <stop offset=".45" stopColor="#22B7E8" />
          <stop offset="1" stopColor="#0B5FC4" />
        </radialGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${id}g)`} />
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="rgba(255,255,255,.35)" />
      <ellipse cx="16" cy="9.5" rx="10" ry="5.5" fill={`url(#${id}s)`} />
      <path d="M8 19.5l4.2-4.5 3.6 3 6.4-7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand({ size = 28, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="tw-brand">
      <BrandMark size={size} />
      {!compact && <span>Trustworthy</span>}
    </span>
  );
}
