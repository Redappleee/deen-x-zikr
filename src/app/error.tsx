"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-6 text-center shadow-card dark:border-red-900/40 dark:bg-dark-800">
      <h2 className="text-xl font-semibold text-red-700 dark:text-red-300">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Please retry. If the issue continues, check your API/environment configuration.</p>
      <button
        className="mt-5 rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white"
        onClick={() => reset()}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
