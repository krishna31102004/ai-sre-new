export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <path d="M16 2.5 L28 9.25 V22.75 L16 29.5 L4 22.75 V9.25 Z" stroke="#EDE8E0" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 9.25 L16 16 L28 9.25 M16 16 V29.5" stroke="#EDE8E0" strokeOpacity="0.9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M16 2.5 V16 M4 22.75 L16 16 M28 22.75 L16 16" stroke="#EDE8E0" strokeOpacity="0.22" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.8" fill="#FF6A3D" />
    </svg>
  );
}
