export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Magnifying glass ring */}
      <circle cx="21" cy="21" r="16" stroke="#07a454" strokeWidth="4" fill="#ffffff" />
      {/* House inside the lens */}
      <path
        d="M13.5 22.5L21 15.5L28.5 22.5"
        stroke="#07a454"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 21V27.5C15.5 28.05 15.95 28.5 16.5 28.5H25.5C26.05 28.5 26.5 28.05 26.5 27.5V21"
        stroke="#07a454"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="19.7" y="23.8" width="2.8" height="4.7" rx="0.4" fill="#07a454" />
      {/* Magnifying glass handle */}
      <line
        x1="32.2"
        y1="32.2"
        x2="41"
        y2="41"
        stroke="#07a454"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-xl font-bold tracking-tight text-gray-900">
        Home<span className="text-brand-primary">spy</span>
      </span>
    </span>
  );
}
