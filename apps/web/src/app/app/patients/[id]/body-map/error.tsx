'use client';
export default function BodyMapError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-5">
      <h1 className="font-serif text-2xl">Body map could not be loaded</h1>
      <p className="mt-2 text-sm">The annotation list and models are temporarily unavailable.</p>
      <button onClick={reset} className="mt-3 rounded bg-info px-3 py-2 text-sm text-white">
        Retry
      </button>
    </div>
  );
}
