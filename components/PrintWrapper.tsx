'use client';

import { PropsWithChildren, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface PrintWrapperProps {
  title: string;
  printLabel: string;
}

export default function PrintWrapper({ title, printLabel, children }: PropsWithChildren<PrintWrapperProps>) {
  const printRef = useRef<HTMLDivElement | null>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef as any });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{title}</p>
        </div>
        <button type="button" onClick={handlePrint} className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Print {printLabel}
        </button>
      </div>
      <div ref={printRef} className="print-page rounded-3xl border border-slate-200 bg-white p-4 shadow-panel">
        {children}
      </div>
    </div>
  );
}
