import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-emerald-100 bg-surface p-8 text-center shadow-card dark:border-emerald-900/40 dark:bg-dark-800">
      <h2 className="text-2xl font-semibold text-emerald-900 dark:text-emerald-50">Page not found</h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">The page does not exist or has been moved.</p>
      <Link className="mt-6 inline-block rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white" href="/">
        Return home
      </Link>
    </div>
  );
}
