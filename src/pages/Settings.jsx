import { useEffect, useState } from "react";
import { Bot, ChevronDown, Plug, RefreshCw, Send, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/agency/AgencyUI";
import { agencyKeys, useEntityMutation, useKnowledge } from "@/lib/agency-data";
const integrations = [
  [
    "Built-in AI",
    "Powers analysis, ideation, training, and reasoning. No separate AI key is needed.",
    "AI_PROVIDER",
  ],
  [
    "Cloudflare Workers AI",
    "Free-tier thumbnail generation with FLUX Schnell. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN as server-side Base44 secrets.",
    "CLOUDFLARE",
  ],
  [
    "YouTube Data API",
    "Add YOUTUBE_API_KEY as a server-side Base44 secret.",
    "YOUTUBE",
  ],
  [
    "Discord bot",
    "Add DISCORD_BOT_TOKEN as a server-side secret with Message Content Intent and read-only permissions.",
    "DISCORD",
  ],
  ["Notion", "Optional: add NOTION_TOKEN as a server-side secret.", "NOTION"],
];
export default function Settings() {
  const knowledge = useKnowledge(),
    mut = useEntityMutation("KnowledgeEntry", agencyKeys.knowledge);
  const [scope, setScope] = useState("VIDEO_GLOBAL"),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [summary, setSummary] = useState(""),
    [error, setError] = useState(""),
    [integrationStatus, setIntegrationStatus] = useState({}),
    [checkingIntegrations, setCheckingIntegrations] = useState(true);
  const checkIntegrations = async () => {
    setCheckingIntegrations(true);
    try {
      const response = await base44.functions.invoke(
        "getAgencyIntegrationStatus",
        {},
      );
      setIntegrationStatus(response.data || {});
    } catch (err) {
      setError(err?.message || "Integration status could not be checked.");
    } finally {
      setCheckingIntegrations(false);
    }
  };
  useEffect(() => {
    checkIntegrations();
  }, []);
  if (knowledge.isLoading) return <LoadingState />;
  if (knowledge.isError) return <ErrorState />;
  const entries = (knowledge.data || []).filter((k) => k.scope === scope);
  const train = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setBusy(true);
    setError("");
    try {
      const chunks = input.match(/[\s\S]{1,6000}/g) || [];
      for (const chunk of chunks) {
        const learned = await base44.functions.invoke("learnAgencyPrinciple", {
          feedback: chunk,
        });
        await mut.mutateAsync({
          action: "create",
          data: {
            scope,
            userInput: chunk,
            learnedPrinciple: String(learned.data.result),
            timestamp: new Date().toISOString(),
          },
        });
      }
      setInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const summarize = async () => {
    setBusy(true);
    try {
      const response = await base44.functions.invoke(
        "summarizeAgencyKnowledge",
        {
          principles: entries
            .map((e) => e.learnedPrinciple)
            .join("\n")
            .slice(0, 12000),
        },
      );
      setSummary(String(response.data.result));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!confirm(`Delete all ${scope} knowledge?`)) return;
    await Promise.all(
      entries.map((e) => mut.mutateAsync({ action: "delete", id: e.id })),
    );
    setSummary("");
  };
  return (
    <section className="agency-enter">
      <PageHeader
        title="Settings"
        description="Training and secure integration setup. Secret values are never stored in normal app records."
      />
      <h2 className="mb-4 text-xl font-semibold text-agency-primary">
        Integrations
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map(([name, guide, key]) => (
          <article className="agency-glass rounded-2xl p-5" key={key}>
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-[#64D2FF]">
                <Plug className="h-5 w-5" />
              </span>
              <span
                className={`agency-status ${integrationStatus[key]?.state === "connected" ? "green" : integrationStatus[key]?.state === "available" ? "blue" : "neutral"}`}
              >
                {checkingIntegrations
                  ? "Checking…"
                  : integrationStatus[key]?.label || "Unavailable"}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-agency-primary">{name}</h3>
            <details className="group mt-3 text-sm text-agency-muted">
              <summary className="flex cursor-pointer items-center gap-1 text-[#64D2FF]">
                Setup guide{" "}
                <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180" />
              </summary>
              <p className="mt-3 leading-6">
                {guide} After saving the secret, deploy the backend and use Test
                Connection. Never paste secrets into this page.
              </p>
            </details>
            <button
              className="agency-button-secondary mt-4 w-full"
              onClick={checkIntegrations}
              disabled={checkingIntegrations}
            >
              <RefreshCw className="h-4 w-4" />
              Check status
            </button>
          </article>
        ))}
      </div>
      <div className="mt-9 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-agency-primary">
            AI training
          </h2>
          <p className="mt-1 text-sm text-agency-muted">
            Persistent global principles used by downstream AI tools.
          </p>
        </div>
        <select
          className="agency-filter"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            setSummary("");
          }}
        >
          <option value="VIDEO_GLOBAL">Video & Ideation</option>
          <option value="THUMBNAIL_GLOBAL">Thumbnail</option>
        </select>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <article className="agency-glass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#64D2FF]" />
            <h3 className="font-semibold text-agency-primary">
              Train the system
            </h3>
          </div>
          <form onSubmit={train}>
            <label className="agency-field">
              <span>Examples, principles, references, and explanations</span>
              <textarea
                rows={8}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste training material…"
              />
            </label>
            {error && <p className="mt-3 text-sm text-[#FF453A]">{error}</p>}
            <button
              disabled={busy || !input.trim()}
              className="agency-button-primary mt-3 w-full"
            >
              <Send className="h-4 w-4" />
              {busy ? "Learning…" : "Extract and save principle"}
            </button>
          </form>
        </article>
        <article className="agency-glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-agency-primary">
                Current knowledge
              </h3>
              <p className="mt-1 text-xs text-agency-muted">
                {entries.length} saved principles
              </p>
            </div>
            <button
              onClick={reset}
              disabled={!entries.length}
              className="agency-icon-button h-9 w-9 rounded-lg"
            >
              <Trash2 className="m-auto h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 max-h-72 space-y-2 overflow-auto agency-scrollbar">
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-xl bg-white/[.035] p-3 text-sm leading-6 text-agency-muted"
              >
                {e.learnedPrinciple}
              </div>
            ))}
            {!entries.length && (
              <p className="text-sm text-agency-muted">
                No training principles saved yet.
              </p>
            )}
          </div>
          <button
            onClick={summarize}
            disabled={!entries.length || busy}
            className="agency-button-secondary mt-4 w-full"
          >
            View current knowledge
          </button>
          {summary && (
            <div className="mt-4 whitespace-pre-wrap rounded-xl bg-white/[.035] p-4 text-sm leading-6 text-agency-muted">
              {summary}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
