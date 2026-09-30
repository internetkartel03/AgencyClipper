import { useEffect, useState } from "react";
import { MailPlus, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/agency/AgencyUI";
import {
  agencyKeys,
  labelize,
  money,
  useClients,
  useEntityMutation,
  useTeam,
} from "@/lib/agency-data";
import { calculateTeamCapacity } from "@/lib/operations";
const blank = { client: "", role: "CHANNEL_MANAGER", name: "", cost: 0 };
export default function Team() {
  const clients = useClients(),
    team = useTeam(),
    mutation = useEntityMutation("TeamMember", agencyKeys.team);
  const [form, setForm] = useState(blank),
    [open, setOpen] = useState(false),
    [users, setUsers] = useState([]),
    [usersLoading, setUsersLoading] = useState(true),
    [usersError, setUsersError] = useState(""),
    [invite, setInvite] = useState({ email: "", role: "user" }),
    [inviteBusy, setInviteBusy] = useState(false),
    [inviteMessage, setInviteMessage] = useState("");
  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      setUsers(await base44.entities.User.list("-created_date", 200));
    } catch (error) {
      setUsersError(error?.message || "Team logins could not be loaded.");
    } finally {
      setUsersLoading(false);
    }
  };
  useEffect(() => {
    loadUsers();
  }, []);
  if (clients.isLoading || team.isLoading) return <LoadingState />;
  if (clients.isError || team.isError) return <ErrorState />;
  const members = team.data || [];
  const save = async (e) => {
    e.preventDefault();
    await mutation.mutateAsync({
      action: "create",
      data: { ...form, cost: Number(form.cost) },
    });
    setForm(blank);
    setOpen(false);
  };
  const capacity = calculateTeamCapacity(members);
  const inviteUser = async (event) => {
    event.preventDefault();
    setInviteBusy(true);
    setInviteMessage("");
    try {
      await base44.auth.inviteUser(invite.email.trim(), invite.role);
      setInviteMessage(`Invitation sent to ${invite.email.trim()}.`);
      setInvite({ email: "", role: "user" });
      await loadUsers();
    } catch (error) {
      setInviteMessage(error?.message || "The invitation could not be sent.");
    } finally {
      setInviteBusy(false);
    }
  };
  return (
    <section className="agency-enter">
      <PageHeader
        title="Team"
        description={`${members.length} allocations · capacity warning at 4+ clients`}
        actions={
          <button
            className="agency-button-primary"
            onClick={() => setOpen((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            Assign member
          </button>
        }
      />
      <div className="agency-glass mb-5 flex flex-wrap gap-2 rounded-2xl p-4">
        {capacity.map((person) => (
          <span
            key={person.name}
            className={`agency-status ${person.overloaded ? "orange" : "green"}`}
          >
            {person.name}: {person.clients} client
            {person.clients === 1 ? "" : "s"}
          </span>
        ))}
        {!capacity.length && (
          <span className="text-sm text-agency-muted">
            No capacity data yet.
          </span>
        )}
      </div>
      <article className="agency-glass mb-5 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <MailPlus className="h-5 w-5 text-[#64D2FF]" />
          <h2 className="font-semibold text-agency-primary">Team logins</h2>
        </div>
        <p className="mt-1 text-sm text-agency-muted">
          Invite people to sign in from any network and control whether they receive member or administrator access.
        </p>
        <form onSubmit={inviteUser} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
          <label className="agency-field">
            <span>Email address</span>
            <input type="email" required value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder="teammate@example.com" />
          </label>
          <label className="agency-field">
            <span>Access</span>
            <select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}>
              <option value="user">Member</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <button className="agency-button-primary self-end" disabled={inviteBusy || !invite.email.trim()}>
            {inviteBusy ? "Sending…" : "Send invite"}
          </button>
        </form>
        {inviteMessage && <p role="status" className="mt-3 text-sm text-agency-muted">{inviteMessage}</p>}
        <div className="mt-4 divide-y divide-white/[.08] rounded-xl border border-white/[.08]">
          {users.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-agency-primary">{account.full_name || account.email}</p>
                {account.full_name && <p className="truncate text-xs text-agency-muted">{account.email}</p>}
              </div>
              <span className={`agency-status ${account.role === "admin" ? "blue" : "neutral"}`}>{labelize(account.role)}</span>
            </div>
          ))}
          {!usersLoading && !users.length && <p className="p-4 text-sm text-agency-muted">No team logins yet.</p>}
          {usersLoading && <p className="p-4 text-sm text-agency-muted">Loading logins…</p>}
          {usersError && <p role="alert" className="p-4 text-sm text-[#FF453A]">{usersError}</p>}
        </div>
      </article>
      {open && (
        <form
          onSubmit={save}
          className="agency-glass mb-5 grid gap-4 rounded-2xl p-5 sm:grid-cols-2"
        >
          <label className="agency-field">
            <span>Client</span>
            <select
              required
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
            >
              <option value="">Choose client</option>
              {(clients.data || []).map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="agency-field">
            <span>Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="agency-field">
            <span>Role</span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {[
                "CHANNEL_MANAGER",
                "SHORT_FORM_EDITOR",
                "LONG_FORM_EDITOR",
                "THUMBNAIL_DESIGNER",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="agency-field">
            <span>Monthly cost</span>
            <input
              type="number"
              min="0"
              value={form.cost}
              onChange={(e) =>
                setForm({ ...form, cost: Number(e.target.value) })
              }
            />
          </label>
          <button className="agency-button-primary sm:col-span-2">
            Save allocation
          </button>
        </form>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {(clients.data || []).map((client) => {
          const rows = members.filter((m) => m.client === client.id),
            cost = rows.reduce((s, m) => s + (Number(m.cost) || 0), 0);
          return (
            <article key={client.id} className="agency-glass rounded-2xl p-5">
              <div className="flex justify-between">
                <div>
                  <h2 className="font-semibold text-agency-primary">
                    {client.name}
                  </h2>
                  <p className="mt-1 text-xs text-agency-muted">
                    {money(cost)}/month team cost
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {rows.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl bg-white/[.035] p-3"
                  >
                    <div>
                      <p className="text-sm text-agency-primary">{m.name}</p>
                      <p className="text-xs text-agency-muted">
                        {labelize(m.role)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-agency-muted">
                        {money(m.cost)}
                      </span>
                      <button
                        onClick={() =>
                          mutation.mutate({ action: "delete", id: m.id })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-[#FF453A]" />
                      </button>
                    </div>
                  </div>
                ))}
                {!rows.length && (
                  <p className="text-sm text-agency-muted">No team assigned.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {capacity.some((person) => person.overloaded) && (
        <div className="mt-5 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm text-orange-300">
          Capacity warning: one or more team members are assigned to four or
          more clients.
        </div>
      )}
    </section>
  );
}
