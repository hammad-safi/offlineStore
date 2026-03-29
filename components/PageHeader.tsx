'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{title}</p>
        {description ? <h2 className="mt-2 text-2xl font-semibold text-slate-900">{description}</h2> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
