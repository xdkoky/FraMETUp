export default function Loading() {
  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-24 rounded bg-surface-2" />
      <div className="mt-3 h-10 w-80 max-w-full rounded bg-surface-2" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
