export default function OfflinePage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-surface p-8 text-center shadow-card dark:border-emerald-900/30 dark:bg-dark-800">
      <h1 className="text-2xl font-semibold text-emerald-900 dark:text-emerald-50">Offline Mode</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">You are offline. Last-read Surah and saved progress remain available.</p>
    </div>
  );
}
