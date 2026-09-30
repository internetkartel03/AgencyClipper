import { useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
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
  useObjectives,
  usePayments,
  useProgress,
} from "@/lib/agency-data";
import { useAuth } from "@/lib/AuthContext";
export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const clients = useClients(),
    payments = usePayments({ enabled: isAdmin }),
    progress = useProgress(),
    objectives = useObjectives(),
    mut = useEntityMutation("DailyObjective", agencyKeys.objectives);
  const [text, setText] = useState("");
  useEffect(() => {
    if (!objectives.isLoading && !objectives.data?.length)
      mut.mutate({
        action: "create",
        data: {
          text: "Review every active client’s first-30-day views and refund-risk status",
          completed: false,
          date: new Date().toISOString().slice(0, 10),
        },
      });
  }, [objectives.isLoading, objectives.data?.length]);
  const model = useMemo(() => {
    const active = (clients.data || []).filter((c) => c.status === "ACTIVE"),
      month = new Date().toISOString().slice(0, 7),
      paid = (payments.data || [])
        .filter((p) => p.status === "PAID" && p.paidDate?.startsWith(month))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0),
      outstanding = (payments.data || [])
        .filter((p) => p.status !== "PAID")
        .reduce((s, p) => s + (Number(p.amount) || 0), 0),
      stages = Object.fromEntries(
        (progress.data || []).map((p) => [p.client, p.stage]),
      );
    return {
      active,
      paid,
      outstanding,
      mrr: active.reduce((s, c) => s + (Number(c.monthlyFee) || 0), 0),
      stages,
    };
  }, [clients.data, payments.data, progress.data]);
  if ([clients, payments, progress, objectives].some((q) => q.isLoading))
    return <LoadingState />;
  if ([clients, payments, progress, objectives].some((q) => q.isError))
    return <ErrorState />;
  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await mut.mutateAsync({
      action: "create",
      data: {
        text: text.trim(),
        completed: false,
        date: new Date().toISOString().slice(0, 10),
      },
    });
    setText("");
  };
  const cards = isAdmin
    ? [
        ["Total MRR", money(model.mrr)],
        ["Active clients", model.active.length],
        ["Revenue this month", money(model.paid)],
        ["Outstanding", money(model.outstanding)],
      ]
    : [["Active clients", model.active.length]];
  return (
    <section className="agency-enter">
      <PageHeader
        title="Dashboard"
        description="A live operating view derived from agency records."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([l, v]) => (
          <div className="agency-glass rounded-2xl p-5" key={l}>
            <p className="text-xs text-agency-muted">{l}</p>
            <p className="mt-3 text-2xl font-semibold text-agency-primary">
              {v}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {model.active.map((c) => {
          const days = c.startDate
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - new Date(`${c.startDate}T12:00:00`).getTime()) /
                    86400000,
                ),
              )
            : null;
          return (
            <article className="agency-glass rounded-2xl p-5" key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-agency-primary">
                    {c.name}
                  </h2>
                  <p className="mt-1 text-xs text-agency-muted">
                    {money(c.monthlyFee)}/month
                  </p>
                </div>
                <span className="agency-status blue">
                  {labelize(model.stages[c.id] || "WAITING_FOR_FOOTAGE")}
                </span>
              </div>
              {days !== null && days <= 30 && (
                <p
                  className={`mt-4 text-xs ${days >= 24 ? "text-[#FF9F0A]" : "text-agency-muted"}`}
                >
                  Day {days} of first 30 · track views against the agreed
                  baseline
                </p>
              )}
            </article>
          );
        })}
      </div>
      <article className="agency-glass mt-5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-agency-primary">
          Daily objectives
        </h2>
        <p className="mt-1 text-xs text-agency-muted">
          Agency rule: monitor each client’s first 30 days and review the
          full-refund commitment against actual views data.
        </p>
        <form onSubmit={add} className="mt-4 flex gap-2">
          <input
            className="agency-filter flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add today’s objective…"
          />
          <button className="agency-button-primary">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {(objectives.data || []).map((o) => (
            <button
              key={o.id}
              onClick={() =>
                mut.mutate({
                  action: "update",
                  id: o.id,
                  data: { completed: !o.completed },
                })
              }
              className="flex w-full items-center gap-3 rounded-xl bg-white/[.035] p-3 text-left"
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-md border ${o.completed ? "border-[#30D158] bg-[#30D158] text-black" : "border-white/20"}`}
              >
                {o.completed && <Check className="h-3 w-3" />}
              </span>
              <span
                className={`text-sm ${o.completed ? "text-agency-muted line-through" : "text-agency-primary"}`}
              >
                {o.text}
              </span>
            </button>
          ))}
          {!objectives.data?.length && (
            <p className="text-sm text-agency-muted">No objectives yet.</p>
          )}
        </div>
      </article>
    </section>
  );
}
