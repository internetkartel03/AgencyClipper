import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ExternalLink, RefreshCw, Users } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AiUnavailable,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/agency/AgencyUI";
import ClientModal from "@/components/agency/ClientModal";
import {
  agencyKeys,
  labelize,
  money,
  parseJson,
  shortDate,
  useAnalytics,
  useClients,
  useEntityMutation,
  usePayments,
  useProgress,
  useTeam,
} from "@/lib/agency-data";
import {
  analyzeChannel,
  analysisToClient,
  isApiConfigurationError,
} from "@/lib/channel-analysis";
import ClientGrowthTools from "@/components/agency/ClientGrowthTools";
import { useAuth } from "@/lib/AuthContext";

const stages = [
  "WAITING_FOR_FOOTAGE",
  "FILMING",
  "EDITING_SHORT_FORM",
  "EDITING_LONG_FORM",
  "DESIGNING_THUMBNAIL",
  "IN_REVIEW",
  "UPLOADING",
  "PUBLISHED",
];
export default function ClientDetail() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { id } = useParams();
  const clients = useClients();
  const progress = useProgress();
  const payments = usePayments({ enabled: isAdmin });
  const team = useTeam();
  const analytics = useAnalytics();
  const clientMutation = useEntityMutation("Client", agencyKeys.clients);
  const progressMutation = useEntityMutation(
    "ClientProgress",
    agencyKeys.progress,
  );
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const client = clients.data?.find((item) => item.id === id);
  const clientProgress = useMemo(
    () =>
      (progress.data || [])
        .filter((item) => item.client === id)
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.updated_date).getTime() -
            new Date(a.updatedAt || a.updated_date).getTime(),
        )[0],
    [progress.data, id],
  );
  const clientPayments = (payments.data || [])
    .filter((item) => item.client === id)
    .sort((a, b) => `${b.dueDate}`.localeCompare(`${a.dueDate}`));
  const members = (team.data || []).filter((item) => item.client === id);
  const metrics = (analytics.data || [])
    .filter((item) => item.client === id)
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))[0];
  if (
    [clients, progress, payments, team, analytics].some(
      (query) => query.isLoading,
    )
  )
    return <LoadingState />;
  if (!client) return <ErrorState message="Client not found." />;
  const strategy = parseJson(client.contentStrategy);
  const opportunities = parseJson(client.growthOpportunities);
  const uploads = parseJson(client.latestUploads);
  async function refresh() {
    setRefreshing(true);
    setRefreshError("");
    setApiMissing(false);
    try {
      const data = analysisToClient(await analyzeChannel(client.channelUrl));
      await clientMutation.mutateAsync({ action: "update", id, data });
    } catch (error) {
      if (isApiConfigurationError(error)) setApiMissing(true);
      else
        setRefreshError(error?.message || "Analysis could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }
  async function moveStage(stage) {
    await progressMutation.mutateAsync({
      action: clientProgress ? "update" : "create",
      id: clientProgress?.id,
      data: {
        client: id,
        stage,
        source: "MANUAL",
        updatedAt: new Date().toISOString(),
      },
    });
  }
  return (
    <section className="agency-enter">
      <Link
        to="/clients"
        className="mb-5 inline-flex items-center gap-2 text-sm text-agency-muted hover:text-agency-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        All clients
      </Link>
      <PageHeader
        eyebrow="Agency Admin / Clients"
        title={client.name}
        description={`${labelize(client.planType)} · ${money(client.monthlyFee)}/month`}
        actions={
          isAdmin ? (
            <>
              <button
                className="agency-button-secondary"
                onClick={() => setEditing(true)}
              >
                Edit client
              </button>
              <button
                disabled={refreshing}
                className="agency-button-primary"
                onClick={refresh}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh analysis
              </button>
            </>
          ) : null
        }
      />
      {(apiMissing || (!client.channelSummary && !client.contentStrategy)) && (
        <div className="mb-5">
          <AiUnavailable />
        </div>
      )}
      {refreshError && (
        <p className="mb-5 text-sm text-[#FF453A]">{refreshError}</p>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <article className="agency-glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/5">
              {client.channelThumbnail && (
                <img
                  src={client.channelThumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-agency-primary">
                Channel overview
              </h2>
              <a
                href={client.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-[#64D2FF]"
              >
                Open on YouTube <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-agency-muted">
            {client.channelSummary || "No channel summary yet."}
          </p>
          {client.contentStyleAnalysis && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold text-agency-primary">
                Content style
              </h3>
              <p className="mt-2 text-sm leading-6 text-agency-muted">
                {client.contentStyleAnalysis}
              </p>
            </div>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-agency-primary">
                Offers
              </h3>
              <p className="mt-2 text-sm leading-6 text-agency-muted">
                {client.offers || "No offers identified."}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-agency-primary">
                Growth opportunities
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-agency-muted">
                {opportunities.length ? (
                  opportunities.map((item, i) => <li key={i}>• {item}</li>)
                ) : (
                  <li>No opportunities analyzed yet.</li>
                )}
              </ul>
            </div>
          </div>
        </article>
        <article className="agency-glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-agency-primary">
            Latest uploads
          </h2>
          <p className="mt-1 text-xs text-agency-muted">
            Classified by duration, not the Shorts tab.
          </p>
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto agency-scrollbar">
            {uploads.length ? (
              uploads.map((video, i) => (
                <a
                  key={i}
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-white/[.035] p-3"
                >
                  <p className="line-clamp-2 text-sm text-agency-primary">
                    {video.title}
                  </p>
                  <div className="mt-2 flex gap-2 text-[11px] text-agency-muted">
                    <span
                      className={`agency-format ${video.format === "LONG_FORM" ? "long" : "short"}`}
                    >
                      {labelize(video.format)}
                    </span>
                    <span>
                      {Math.floor(video.durationSeconds / 60)}:
                      {String(video.durationSeconds % 60).padStart(2, "0")}
                    </span>
                  </div>
                </a>
              ))
            ) : (
              <p className="text-sm text-agency-muted">
                Refresh analysis to load recent uploads.
              </p>
            )}
          </div>
        </article>
      </div>
      <article className="agency-glass mt-5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-agency-primary">
          Content strategy
        </h2>
        <p className="mt-1 text-sm text-agency-muted">
          Select an action to see the reasoning.
        </p>
        {strategy.length ? (
          <Accordion type="single" collapsible className="mt-4">
            {strategy.map((item, i) => (
              <AccordionItem
                key={i}
                value={`strategy-${i}`}
                className="border-white/10"
              >
                <AccordionTrigger className="text-agency-primary hover:no-underline">
                  <span className="flex gap-3">
                    <span className="text-[#64D2FF]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {typeof item === "string" ? item : item.action}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-9 leading-6 text-agency-muted">
                  {typeof item === "string"
                    ? "No additional reasoning saved."
                    : item.reasoning}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="mt-4">
            <AiUnavailable compact />
          </div>
        )}
      </article>
      <article className="agency-glass mt-5 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-agency-primary">
              Production pipeline
            </h2>
            <p className="mt-1 text-sm text-agency-muted">
              Current stage:{" "}
              {labelize(clientProgress?.stage || "WAITING_FOR_FOOTAGE")}
            </p>
          </div>
        </div>
        <div className="agency-pipeline mt-6">
          {stages.map((stage, index) => {
            const activeIndex = stages.indexOf(
              clientProgress?.stage || "WAITING_FOR_FOOTAGE",
            );
            return (
              <button
                key={stage}
                onClick={() => moveStage(stage)}
                className={index <= activeIndex ? "is-complete" : ""}
              >
                <span>{index < activeIndex ? <Check /> : index + 1}</span>
                <small>{labelize(stage)}</small>
              </button>
            );
          })}
        </div>
      </article>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="agency-glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-agency-primary">
            <Users className="h-5 w-5 text-[#64D2FF]" />
            Assigned team
          </h2>
          <div className="mt-4 space-y-3">
            {members.length ? (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex justify-between rounded-xl bg-white/[.035] p-3"
                >
                  <div>
                    <p className="text-sm text-agency-primary">{member.name}</p>
                    <p className="mt-1 text-xs text-agency-muted">
                      {labelize(member.role)}
                    </p>
                  </div>
                  <span className="text-sm text-agency-muted">
                    {money(member.cost)}/mo
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-agency-muted">
                No team members assigned.
              </p>
            )}
          </div>
        </article>
        {isAdmin && (
          <article className="agency-glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-agency-primary">
              Payments
            </h2>
            <div className="mt-4 space-y-3">
              {clientPayments.length ? (
                clientPayments.slice(0, 5).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl bg-white/[.035] p-3"
                  >
                    <div>
                      <p className="text-sm text-agency-primary">
                        {money(payment.amount)} · {labelize(payment.type)}
                      </p>
                      <p className="mt-1 text-xs text-agency-muted">
                        Due {shortDate(payment.dueDate)}
                      </p>
                    </div>
                    <span
                      className={`agency-status ${payment.status === "PAID" ? "green" : payment.status === "OVERDUE" ? "red" : "orange"}`}
                    >
                      {labelize(payment.status)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-agency-muted">
                  No payments recorded.
                </p>
              )}
            </div>
          </article>
        )}
        <article className="agency-glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-agency-primary">
            Performance
          </h2>
          {metrics ? (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                ["Views", metrics.views],
                ["Subscribers", metrics.subscribers],
                ["Watch hours", metrics.watchHours],
                ["CTR", `${metrics.impressionsCTR || 0}%`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-agency-muted">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-agency-primary">
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-agency-muted">
              No analytics snapshots available.
            </p>
          )}
        </article>
        <article className="agency-glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-agency-primary">Notes</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-agency-muted">
            {client.notes ||
              "No notes yet. Use Edit client to add context for the team."}
          </p>
        </article>
      </div>
      {isAdmin && <ClientGrowthTools client={client} />}
      {isAdmin && (
        <ClientModal
          open={editing}
          onOpenChange={setEditing}
          client={client}
          onSave={(data) =>
            clientMutation.mutateAsync({ action: "update", id, data })
          }
        />
      )}
    </section>
  );
}
