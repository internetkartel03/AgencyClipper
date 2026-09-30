import { useState } from "react";
import { LogOut, UserRoundX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PageHeader } from "@/components/agency/AgencyUI";
import { useAuth } from "@/lib/AuthContext";

export default function Account() {
  const { user, logout } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setDeleteOpen(false);
    setConfirmation("");
    setError("");
  };

  const deleteAccount = async () => {
    if (confirmation !== "DELETE") return;
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("deleteOwnAccount", { confirmation });
      logout(true);
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Account deletion failed.",
      );
      setBusy(false);
    }
  };

  return (
    <section className="agency-enter">
      <PageHeader title="Account" description="Manage your Cut Ledger login and session." />
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="agency-glass rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-agency-primary">Signed-in account</h2>
          <p className="mt-2 text-sm text-agency-muted">{user?.email}</p>
          <p className="mt-1 text-xs text-agency-muted">Access: {user?.role || "member"}</p>
          <button className="agency-button-secondary mt-5" onClick={() => logout(true)}>
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </article>
        <article className="agency-glass rounded-2xl border border-[#FF453A]/20 p-5">
          <h2 className="text-lg font-semibold text-agency-primary">Delete account</h2>
          <p className="mt-2 text-sm leading-6 text-agency-muted">
            Permanently remove your login and private workspace history. Shared agency records remain intact.
          </p>
          <button className="agency-button-secondary mt-5 border-[#FF453A]/30 text-[#FF453A]" onClick={() => setDeleteOpen(true)}>
            <UserRoundX className="h-4 w-4" /> Delete account
          </button>
        </article>
      </div>
      {deleteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <article className="agency-glass w-full max-w-lg rounded-3xl p-6">
            <h2 id="delete-account-title" className="text-2xl font-semibold text-agency-primary">Delete your account?</h2>
            <p className="mt-3 text-sm leading-6 text-agency-muted">
              This cannot be undone. The final administrator is protected and cannot delete their account until another administrator exists.
            </p>
            <label className="agency-field mt-5">
              <span>Type DELETE to confirm</span>
              <input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-[#FF453A]">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button className="agency-button-secondary" onClick={close} disabled={busy}>Cancel</button>
              <button className="agency-button-primary bg-[#FF453A]" onClick={deleteAccount} disabled={confirmation !== "DELETE" || busy}>
                {busy ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
