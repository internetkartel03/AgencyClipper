import { useLocation } from "react-router-dom";
import { navigation } from "@/components/agency/navigation";

export default function AgencyPlaceholder() {
  const { pathname } = useLocation();
  const current =
    navigation.find((item) => item.path === pathname) || navigation[0];
  const Icon = current.icon;
  return (
    <section aria-labelledby="page-title" className="agency-enter">
      <div className="mb-12 sm:mb-16">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[.18em] text-agency-muted">
          Cut Ledger <span className="mx-1.5 opacity-50">/</span> Workspace
        </p>
        <h1
          id="page-title"
          className="text-[32px] font-semibold leading-tight tracking-[-.02em] text-agency-primary sm:text-[34px]"
        >
          {current.label}
        </h1>
      </div>
      <div className="agency-glass flex min-h-[310px] flex-col items-center justify-center rounded-2xl px-6 py-12 text-center sm:min-h-[390px]">
        <div className="agency-tile mb-6 flex h-14 w-14 items-center justify-center rounded-2xl">
          <Icon size={26} strokeWidth={1.5} />
        </div>
        <h2 className="text-[21px] font-semibold tracking-[-.02em] text-agency-primary">
          {current.label}
        </h2>
        <p className="mt-2 text-[15px] text-agency-muted">Coming soon.</p>
      </div>
    </section>
  );
}
