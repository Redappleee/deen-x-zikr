import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  className?: string;
};

export function SectionHeading({ title, subtitle, className }: Props): React.JSX.Element {
  return (
    <div className={cn("mb-6", className)}>
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-50 md:text-3xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300 md:text-base">{subtitle}</p> : null}
    </div>
  );
}
