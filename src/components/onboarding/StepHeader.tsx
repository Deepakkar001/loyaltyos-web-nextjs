interface StepHeaderProps {
  title: string;
  description: string;
  badge?: string;
}

export function StepHeader({ title, description, badge }: StepHeaderProps) {
  return (
    <div className="mb-10">
      {badge && (
        <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1 rounded-full mb-3">
          {badge}
        </span>
      )}
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        {title}
      </h1>
      <p className="text-slate-500 mt-2 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

