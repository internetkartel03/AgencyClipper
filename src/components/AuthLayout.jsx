import React from "react";
import cutLedgerLogo from "@/assets/cut-ledger-logo-transparent.png";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <main className="cut-ledger-auth min-h-screen px-4 py-10">
      <div className="cut-ledger-auth-glow" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-5 text-center">
          <img
            src={cutLedgerLogo}
            alt="Cut Ledger"
            className="mx-auto h-auto w-[155px] max-w-[48vw] object-contain"
          />
          <h1 className="text-[30px] font-semibold tracking-[-0.035em] text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm tracking-[0.01em] text-white/50">
              {subtitle}
            </p>
          )}
        </div>
        <div className="cut-ledger-auth-panel rounded-[22px] p-6">
          {children}
        </div>
        {footer && (
          <p className="mt-4 text-center text-sm text-white/45">{footer}</p>
        )}
      </div>
    </main>
  );
}
