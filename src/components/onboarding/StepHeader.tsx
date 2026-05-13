interface StepHeaderProps {
  title: string;
  description: string;
  badge?: string;
}

export function StepHeader({ title, description, badge }: StepHeaderProps) {
  return (
    <div className="mb-6">
      {badge && (
        <span className="inline-block text-xs font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary-soft)] px-3 py-1 rounded-full mb-3">
          {badge}
        </span>
      )}
      <h1 className="text-2xl font-bold text-foreground tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

