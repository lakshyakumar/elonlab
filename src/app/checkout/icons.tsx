/**
 * Inline stroke icons (lucide geometry) so the storefront needs no icon
 * dependency. Size comes from CSS `width`/`height` on the svg; colour from
 * `currentColor`.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ShieldCheck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function LogIn({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

export function LogOut({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function Globe({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function Cart({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

export function User({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function ArrowLeft({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export function MapPin({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function Mail({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function Phone({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </svg>
  );
}

export function Package({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export function Tag({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

export function CreditCard({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function Menu({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function Coins({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

export function ChevronRight({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function X({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function HelpCircle({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function AlertTriangle({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function FlaskConical({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
      <path d="M6.453 15h11.094" />
      <path d="M8.5 2h7" />
    </svg>
  );
}

/** Brand mark: the bordered tile from the header lockup. */
export function BrandMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="7" fill="#fff" stroke="#d8dce3" strokeWidth="1.5" />
      <rect x="5.5" y="7" width="37" height="34" rx="3" fill="none" stroke="#0f1729" strokeWidth="1.5" />
      <g stroke="#1d3c96" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M11.5 27 18.5 20l4.5 4.5L31.5 16" />
        <path d="M27 16h4.5v4.5" />
      </g>
      <rect x="11" y="29.5" width="4.5" height="1.8" rx="0.9" fill="#0f1729" />
      <rect x="18" y="29.5" width="4.5" height="1.8" rx="0.9" fill="#0f1729" />
      <text
        x="24"
        y="38"
        textAnchor="middle"
        fill="#0f1729"
        fontSize="5"
        fontWeight="700"
        letterSpacing="-0.05"
        fontFamily="var(--sf-font, sans-serif)"
      >
        ECHELON LABS
      </text>
    </svg>
  );
}

/**
 * Product thumbnail. Placeholder illustration — swap for the real product
 * photograph before this goes in front of customers.
 */
export function VialThumb({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="7" fill="#e8effc" />
      <rect x="24" y="12" width="16" height="8" rx="2" fill="#c3d3ef" />
      <path d="M25 20h14v27a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" fill="#fff" stroke="#9db4dd" strokeWidth="1.6" />
      <path d="M25 38h14v9a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" fill="#cfdcf3" />
      <rect x="27.5" y="9" width="9" height="4" rx="1.4" fill="#8ea7d4" />
      <rect x="28" y="25" width="8" height="1.6" rx="0.8" fill="#c3d3ef" />
      <rect x="28" y="29" width="6" height="1.6" rx="0.8" fill="#c3d3ef" />
    </svg>
  );
}
