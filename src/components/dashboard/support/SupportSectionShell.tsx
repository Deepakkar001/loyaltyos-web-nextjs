"use client";

type Props = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function SupportSectionShell({ title, description, children }: Props) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
