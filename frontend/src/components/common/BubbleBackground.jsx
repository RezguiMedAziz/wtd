// Static decorative bubbles in the brand colors (no animation).
export default function BubbleBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span className="absolute -left-16 top-1/4 h-56 w-56 rounded-full bg-brand-blush/60" />
      <span className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-brand-sky/70" />
      <span className="absolute bottom-16 right-1/4 h-40 w-40 rounded-full bg-brand-butter/80" />
      <span className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-brand-blush/50" />
    </div>
  );
}
