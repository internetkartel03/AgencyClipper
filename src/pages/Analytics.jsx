import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { base44 } from "@/api/base44Client";
import {
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/agency/AgencyUI";
import {
  agencyKeys,
  parseJson,
  useAnalytics,
  useClients,
  useEntityMutation,
} from "@/lib/agency-data";
import { buildAnalyticsSnapshot } from "@/lib/operations";
import { useAuth } from "@/lib/AuthContext";
const blank = {
  client: "",
  date: new Date().toISOString().slice(0, 10),
  views: 0,
  subscribers: 0,
  watchHours: 0,
  impressionsCTR: 0,
  topVideos: "[]",
};
export default function Analytics() {
  const { user } = useAuth(),
    isAdmin = user?.role === "admin";
  const clients = useClients(),
    analytics = useAnalytics(),
    mut = useEntityMutation("AnalyticsSnapshot", agencyKeys.analytics);
  const [selected, setSelected] = useState("ALL"),
    [open, setOpen] = useState(false),
    [form, setForm] = useState(blank),
    [channel, setChannel] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (clients.isLoading || analytics.isLoading) return <LoadingState />;
  if (clients.isError || analytics.isError) return <ErrorState />;
  const rows = (analytics.data || [])
      .filter((a) => selected === "ALL" || a.client === selected)
      .sort((a, b) => a.date.localeCompare(b.date)),
    latest = rows.at(-1);
  const top = parseJson(latest?.topVideos);
  const save = async (e) => {
    e.preventDefault();
    await mut.mutateAsync({
      action: "create",
      data: {
        ...form,
        views: Number(form.views),
        subscribers: Number(form.subscribers),
        watchHours: Number(form.watchHours),
        impressionsCTR: Number(form.impressionsCTR),
      },
    });
    setOpen(false);
  };
  const pull = async () => {
    if (!form.client || !channel.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await base44.functions.invoke("importYouTubeAnalytics", {
        channel,
      });
      await mut.mutateAsync({
        action: "create",
        data: buildAnalyticsSnapshot(form.client, response.data),
      });
      setSelected(form.client);
      setChannel("");
    } catch (e) {
      setError(e?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="agency-enter">
      <PageHeader
        title="Analytics"
        description="Public YouTube performance snapshots plus manual private-metric entry."
        actions={
          isAdmin ? (
            <button
              className="agency-button-primary"
              onClick={() => setOpen((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              Manual snapshot
            </button>
          ) : null
        }
      />
      {isAdmin && (
        <div className="agency-glass mb-5 grid gap-3 rounded-2xl p-4 md:grid-cols-[220px_1fr_auto]">
          <select
            className="agency-filter"
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
          >
            <option value="">Choose client</option>
            {clients.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="agency-filter"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="YouTube URL, handle, or channel ID"
          />
          <button
            className="agency-button-primary"
            disabled={busy || !form.client || !channel.trim()}
            onClick={pull}
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Pull latest
          </button>
          {error && (
            <p className="text-sm text-[#FF453A] md:col-span-3">
              {error}. Manual entry remains available.
            </p>
          )}
        </div>
      )}
      <select
        className="agency-filter mb-5"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="ALL">All clients</option>
        {clients.data.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {isAdmin && open && (
        <form
          onSubmit={save}
          className="agency-glass mb-5 grid gap-4 rounded-2xl p-5 sm:grid-cols-3"
        >
          <select
            required
            className="agency-filter"
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
          >
            <option value="">Choose client</option>
            {clients.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {[
            ["date", "Date", "date"],
            ["views", "Views", "number"],
            ["subscribers", "Subscribers", "number"],
            ["watchHours", "Watch hours", "number"],
            ["impressionsCTR", "CTR %", "number"],
          ].map(([k, l, t]) => (
            <label className="agency-field" key={k}>
              <span>{l}</span>
              <input
                required
                type={t}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <button className="agency-button-primary sm:col-span-3">
            Save snapshot
          </button>
        </form>
      )}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Views", latest?.views],
          ["Subscribers", latest?.subscribers],
          ["Watch hours", latest?.watchHours],
          ["CTR", latest ? `${latest.impressionsCTR || 0}%` : null],
        ].map(([l, v]) => (
          <div className="agency-glass rounded-2xl p-5" key={l}>
            <p className="text-xs text-agency-muted">{l}</p>
            <p className="mt-3 text-2xl font-semibold text-agency-primary">
              {v ?? "—"}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="agency-glass rounded-2xl p-5">
          <h2 className="font-semibold text-agency-primary">Views over time</h2>
          <div className="mt-4 h-72">
            {rows.length ? (
              <ResponsiveContainer>
                <AreaChart data={rows}>
                  <CartesianGrid stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="date" stroke="#86868b" />
                  <YAxis stroke="#86868b" />
                  <Tooltip />
                  <Area dataKey="views" stroke="#64D2FF" fill="#64D2FF33" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-agency-muted">
                No analytics snapshots yet.
              </div>
            )}
          </div>
        </article>
        <article className="agency-glass rounded-2xl p-5">
          <h2 className="font-semibold text-agency-primary">
            Top-performing videos
          </h2>
          <div className="mt-4 space-y-2">
            {top.map((v, i) => (
              <a
                href={v.url}
                target="_blank"
                rel="noreferrer"
                key={v.url || i}
                className="flex justify-between rounded-xl bg-white/[.035] p-3 text-sm"
              >
                <span>{v.title}</span>
                <span className="text-agency-muted">
                  {Number(v.views).toLocaleString()} views
                </span>
              </a>
            ))}
            {!top.length && (
              <p className="text-sm text-agency-muted">
                Pull YouTube data to populate public top videos. CTR and watch
                time remain manual because the public API does not expose them.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
