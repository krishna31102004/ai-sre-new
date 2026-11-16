export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <rect x="2.5" y="2.5" width="27" height="27" rx="7" fill="#141210" stroke="#EDE8E0" strokeOpacity="0.9" strokeWidth="2" />
      <path d="M7 17h5l2-5 3 9 2-6 1.5 2H25" stroke="#FF6A3D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
