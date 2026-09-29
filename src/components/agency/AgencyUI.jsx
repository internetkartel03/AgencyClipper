import { ChevronDown, Sparkles } from 'lucide-react';

/** @param {{eyebrow?: string, title: string, description?: string, actions?: import('react').ReactNode}} props */
export function PageHeader({ eyebrow = 'Agency Admin / Workspace', title, description, actions }) {
  return <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="mb-3 text-[12px] font-medium uppercase tracking-[.18em] text-agency-muted">{eyebrow}</p>
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-.02em] text-agency-primary sm:text-[34px]">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-agency-muted">{description}</p>}
    </div>{actions && <div className="flex shrink-0 gap-2">{actions}</div>}
  </div>;
}

/** @param {{compact?: boolean}} props */
export function AiUnavailable({ compact = false }) {
  return <div className={`agency-soft-card rounded-2xl ${compact ? 'p-4' : 'p-6'}`}>
    <div className="flex gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#64D2FF]" />
      <div className="min-w-0"><p className="text-sm font-medium text-agency-primary">This tool will be available once you connect your API key</p>
        <details className="group mt-2 text-sm text-agency-muted"><summary className="flex cursor-pointer list-none items-center gap-1 text-[#64D2FF]">Here&apos;s how <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></summary>
          <p className="mt-2 leading-6">Open Settings, choose Integrations, add your AI provider API key, and save. This feature will start working automatically.</p>
        </details>
      </div>
    </div>
  </div>;
}

export function LoadingState() {
  return <div className="agency-glass flex min-h-64 items-center justify-center rounded-2xl"><div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-[#64D2FF]" /></div>;
}

/** @param {{message?: string}} props */
export function ErrorState({ message = 'We could not load this data. Please try again.' }) {
  return <div className="agency-glass rounded-2xl p-8 text-center text-sm text-[#FF453A]">{message}</div>;
}
