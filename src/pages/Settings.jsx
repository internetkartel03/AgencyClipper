import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  Clipboard,
  Clock3,
  Plug,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/agency/AgencyUI";
import { agencyKeys, useEntityMutation, useKnowledge } from "@/lib/agency-data";
import {
  getIntegrationDefinition,
  integrationDefinitions,
  integrationStatusTone,
  setupCompletion,
} from "@/lib/integrations";
export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const knowledge = useKnowledge(),
    mut = useEntityMutation("KnowledgeEntry", agencyKeys.knowledge);
  const [scope, setScope] = useState("VIDEO_GLOBAL"),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [summary, setSummary] = useState(""),
    [error, setError] = useState(""),
    [integrationStatus, setIntegrationStatus] = useState({}),
    [checkingIntegrations, setCheckingIntegrations] = useState(true),
    [lastTested, setLastTested] = useState({}),
    [guideKey, setGuideKey] = useState(() => searchParams.get("guide") || ""),
    [guideChecks, setGuideChecks] = useState({}),
    [guideResult, setGuideResult] = useState("");
  const checkIntegrations = async (targetKey = "") => {
    setCheckingIntegrations(true);
    setError("");
    try {
      const response = await base44.functions.invoke(
        "getAgencyIntegrationStatus",
        {},
      );
      setIntegrationStatus(response.data || {});
      const checkedAt = new Date().toISOString();
      setLastTested((current) =>
        targetKey
          ? { ...current, [targetKey]: checkedAt }
          : Object.fromEntries(
              integrationDefinitions.map(({ key }) => [key, checkedAt]),
            ),
      );
      return response.data || {};
    } catch (err) {
      setError(err?.message || "Integration status could not be checked.");
      if (targetKey)
        setIntegrationStatus((current) => ({
          ...current,
          [targetKey]: { state: "error", label: "Error" },
        }));
      return null;
    } finally {
      setCheckingIntegrations(false);
    }
  };
  useEffect(() => {
    checkIntegrations();
  }, []);
  useEffect(() => {
    const requested = searchParams.get("guide");
    if (requested && getIntegrationDefinition(requested))
      setGuideKey(requested);
  }, [searchParams]);
  const guide = getIntegrationDefinition(guideKey);
  const guideProgress = useMemo(
    () =>
      setupCompletion(guideChecks[guideKey] || [], guide?.steps.length || 0),
    [guide, guideChecks, guideKey],
  );
  if (knowledge.isLoading) return <LoadingState />;
  if (knowledge.isError) return <ErrorState />;
  const entries = (knowledge.data || []).filter((k) => k.scope === scope);
  const openGuide = (key) => {
    setGuideKey(key);
    setGuideResult("");
    setSearchParams({ guide: key });
  };
  const closeGuide = () => {
    setGuideKey("");
    setGuideResult("");
    setSearchParams({});
  };
  const testGuide = async () => {
    const result = await checkIntegrations(guideKey);
    if (!result) return;
    setGuideResult(
      result[guideKey]?.state === "connected"
        ? "Connection verified."
        : result[guideKey]?.label || "Not configured yet.",
    );
  };
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
        {integrationDefinitions.map(({ name, description, key, minutes }) => (
          <article className="agency-glass rounded-2xl p-5" key={key}>
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-[#64D2FF]">
                <Plug className="h-5 w-5" />
              </span>
              <span
                className={`agency-status ${integrationStatusTone(integrationStatus[key]?.state)}`}
              >
                {checkingIntegrations
                  ? "Checking…"
                  : integrationStatus[key]?.label || "Unavailable"}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-agency-primary">{name}</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-agency-muted">
              {description}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-agency-muted">
              <Clock3 className="h-3.5 w-3.5" /> About {minutes} min · Last
              tested{" "}
              {lastTested[key]
                ? new Date(lastTested[key]).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "never"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="agency-button-secondary"
                onClick={() => openGuide(key)}
              >
                <ShieldCheck className="h-4 w-4" /> Setup
              </button>
              <button
                className="agency-button-secondary"
                onClick={() => checkIntegrations(key)}
                disabled={checkingIntegrations}
              >
                <RefreshCw
                  className={`h-4 w-4 ${checkingIntegrations ? "animate-spin" : ""}`}
                />
                Test
              </button>
            </div>
          </article>
        ))}
      </div>
      {guide && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="integration-guide-title"
        >
          <article className="agency-glass agency-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#64D2FF]">
                  {guide.required
                    ? "Required integration"
                    : "Optional integration"}{" "}
                  · {guide.minutes} min
                </p>
                <h2
                  id="integration-guide-title"
                  className="mt-2 text-2xl font-semibold text-agency-primary"
                >
                  Connect {guide.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-agency-muted">
                  {guide.description}
                </p>
              </div>
              <button
                className="agency-icon-button h-9 w-9 shrink-0 rounded-xl"
                onClick={closeGuide}
                aria-label="Close setup guide"
              >
                <X className="m-auto h-4 w-4" />
              </button>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs text-agency-muted">
                <span>
                  {guideProgress.complete} of {guideProgress.total} steps
                  checked
                </span>
                <span>{guideProgress.percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#30D158] transition-all"
                  style={{ width: `${guideProgress.percent}%` }}
                />
              </div>
            </div>
            <ol className="mt-5 space-y-3">
              {guide.steps.map((step, index) => (
                <li
                  key={step}
                  className="rounded-2xl border border-white/10 bg-white/[.035] p-4"
                >
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-agency-muted">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#30D158]"
                      checked={Boolean(guideChecks[guideKey]?.[index])}
                      onChange={(event) =>
                        setGuideChecks((current) => {
                          const next = [...(current[guideKey] || [])];
                          next[index] = event.target.checked;
                          return { ...current, [guideKey]: next };
                        })
                      }
                    />
                    <span>
                      <strong className="text-agency-primary">
                        {index + 1}.
                      </strong>{" "}
                      {step}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
            {guide.secretNames.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[#FF9F0A]/20 bg-[#FF9F0A]/[.06] p-4">
                <p className="text-sm font-semibold text-agency-primary">
                  Base44 secret names
                </p>
                <p className="mt-1 text-xs leading-5 text-agency-muted">
                  Copy only these names. Enter their values directly in Base44
                  Secrets.
                </p>
                <div className="mt-3 space-y-2">
                  {guide.secretNames.map((secretName) => (
                    <div
                      key={secretName}
                      className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2 font-mono text-xs text-[#64D2FF]"
                    >
                      <span>{secretName}</span>
                      <button
                        className="agency-icon-button h-8 w-8 rounded-lg"
                        onClick={() =>
                          navigator.clipboard.writeText(secretName)
                        }
                        aria-label={`Copy ${secretName}`}
                      >
                        <Clipboard className="m-auto h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                className="agency-button-primary"
                onClick={testGuide}
                disabled={checkingIntegrations}
              >
                <RefreshCw
                  className={`h-4 w-4 ${checkingIntegrations ? "animate-spin" : ""}`}
                />{" "}
                Test connection
              </button>
              {guideResult && (
                <span className="text-sm text-agency-muted">{guideResult}</span>
              )}
            </div>
            <p className="mt-5 text-xs leading-5 text-agency-muted">
              To disconnect, remove the named secret from Base44 Secrets and
              test again. Never store secret values in frontend code, browser
              storage, logs, or normal database records.
            </p>
          </article>
        </div>
      )}
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
