/** Approved Concept 02 identity. Text stays sharp at every screen size. */
export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`future-brand ${className}`} aria-label="Pharma Oasis">
      <span>pharma</span>
      <strong>oasis</strong>
      <i aria-hidden="true">°</i>
    </span>
  );
}
