import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Image as ImageIcon,
  MessageSquare,
  PanelRight,
  RefreshCw,
  Search,
  Send,
  Save,
  Star,
  Type,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  AiUnavailable,
  ErrorState,
  LoadingState,
} from "@/components/agency/AgencyUI";
import {
  agencyKeys,
  useClients,
  useEntityMutation,
  useKnowledge,
  useThumbnailMessages,
  useThumbnailSessions,
} from "@/lib/agency-data";
import {
  buildVariationPrompts,
  clampOverlayPosition,
  generateAndPersistVariations,
  groupThumbnailMessages,
  isIntegrationUnavailable,
  variationStatus,
} from "@/lib/thumbnail-tools";
async function persistGeneratedImage(dataUrl) {
  const blob = await fetch(dataUrl).then((response) => response.blob());
  const file = new File([blob], `thumbnail-${Date.now()}.jpg`, {
    type: blob.type || "image/jpeg",
  });
  const uploaded = await base44.integrations.Core.UploadFile({ file });
  if (!uploaded?.file_url)
    throw new Error("Generated image could not be stored");
  return uploaded.file_url;
}
export default function Thumbnails() {
  const clients = useClients(),
    sessions = useThumbnailSessions(),
    messages = useThumbnailMessages(),
    knowledge = useKnowledge();
  const sm = useEntityMutation(
      "ThumbnailSession",
      agencyKeys.thumbnailSessions,
    ),
    mm = useEntityMutation("ThumbnailMessage", agencyKeys.thumbnailMessages);
  const [active, setActive] = useState(null),
    [client, setClient] = useState(""),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [panel, setPanel] = useState(true),
    [apiMissing, setApiMissing] = useState(false),
    [errorMessage, setErrorMessage] = useState(""),
    [search, setSearch] = useState(""),
    [overlay, setOverlay] = useState(null),
    end = useRef(null);
  const rows = (messages.data || [])
    .filter((m) => m.session === active)
    .sort((a, b) => `${a.timestamp}`.localeCompare(`${b.timestamp}`));
  const displayRows = useMemo(() => groupThumbnailMessages(rows), [rows]);
  useEffect(() => {
    if (typeof end.current?.scrollIntoView === "function")
      end.current.scrollIntoView({ behavior: "smooth" });
  }, [rows.length, busy]);
  const training = useMemo(
    () =>
      (knowledge.data || [])
        .filter((k) => k.scope === "THUMBNAIL_GLOBAL")
        .map((k) => k.learnedPrinciple)
        .join("\n"),
    [knowledge.data],
  );
  if ([clients, sessions, messages, knowledge].some((q) => q.isLoading))
    return <LoadingState />;
  if ([clients, sessions, messages, knowledge].some((q) => q.isError))
    return <ErrorState />;
  const send = async (override = input) => {
    const concept = typeof override === "string" ? override : input;
    if (!concept.trim() || !client || busy) return;
    setBusy(true);
    setApiMissing(false);
    setErrorMessage("");
    let sid = active;
    try {
      if (!sid) {
        const s = await sm.mutateAsync({
          action: "create",
          data: {
            client,
            title: concept.slice(0, 50),
            createdAt: new Date().toISOString(),
          },
        });
        sid = s.id;
        setActive(sid);
      }
      await mm.mutateAsync({
        action: "create",
        data: {
          session: sid,
          role: "user",
          content: concept,
          timestamp: new Date().toISOString(),
        },
      });
      const history = (
        await base44.entities.ThumbnailMessage.filter(
          { session: sid },
          "timestamp",
          200,
        )
      )
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      const direction = await base44.functions.invoke("directAgencyThumbnail", {
        training: training.slice(0, 6000),
        history: history.slice(-12000),
      });
      await mm.mutateAsync({
        action: "create",
        data: {
          session: sid,
          role: "assistant",
          content: String(direction.data.result),
          timestamp: new Date().toISOString(),
        },
      });
      try {
        const result = await base44.functions.invoke("generateThumbnail", {
          prompt: String(direction.data.result),
          aspect_ratio: "16:9",
          resolution: "4K",
        });
        if (result?.data?.url) {
          const imageUrl = await persistGeneratedImage(result.data.url);
          await mm.mutateAsync({
            action: "create",
            data: {
              session: sid,
              role: "assistant",
              content: "Generated thumbnail",
              imageUrl,
              timestamp: new Date().toISOString(),
            },
          });
        } else throw new Error("Thumbnail service returned no image");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Thumbnail generation failed";
        if (isIntegrationUnavailable(error)) setApiMissing(true);
        else setErrorMessage(message);
      }
      setInput("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      if (isIntegrationUnavailable(error)) setApiMissing(true);
      else setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };
  const rate = (m, r) =>
    mm.mutate({ action: "update", id: m.id, data: { rating: r } });
  const generateVariations = async (message) => {
    if (busy || !message?.imageUrl || !active) return;
    setBusy(true);
    setApiMissing(false);
    setErrorMessage("");
    const group = crypto.randomUUID();
    const direction = rows
      .slice(
        0,
        rows.findIndex((row) => row.id === message.id),
      )
      .reverse()
      .find((row) => row.role === "assistant" && !row.imageUrl)?.content;
    try {
      const prompts = buildVariationPrompts(direction || message.content);
      const { failures, missingIntegration, saved } =
        await generateAndPersistVariations({
          prompts,
          generate: async (prompt) => {
            const result = await base44.functions.invoke("generateThumbnail", {
              prompt,
              aspect_ratio: "16:9",
              resolution: "4K",
            });
            if (!result?.data?.url) throw new Error("No image was returned");
            return persistGeneratedImage(result.data.url);
          },
          persist: (imageUrl, index) =>
            mm.mutateAsync({
              action: "create",
              data: {
                session: active,
                role: "assistant",
                content: `Variation ${index + 1} of 3`,
                imageUrl,
                variationGroup: group,
                variationIndex: index + 1,
                timestamp: new Date(Date.now() + index).toISOString(),
              },
            }),
        });
      if (missingIntegration) setApiMissing(true);
      if (failures.length && !missingIntegration)
        setErrorMessage(
          `${saved} of 3 variations were saved. ${failures
            .map(
              ({ index, error }) =>
                `Variation ${index + 1}: ${error instanceof Error ? error.message : "failed"}`,
            )
            .join(" ")}`,
        );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Variations could not be saved";
      if (isIntegrationUnavailable(error)) setApiMissing(true);
      else setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };
  const saveOverlay = async () => {
    if (!overlay?.text.trim()) return;
    setBusy(true);
    setErrorMessage("");
    try {
      const response = await fetch(overlay.message.imageUrl);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0);
      const scale = canvas.width / 960;
      context.font = `900 ${Math.round(overlay.size * scale)}px ${overlay.font}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      context.lineWidth = Math.max(4, Math.round(8 * scale));
      const x = (overlay.position.x / 100) * canvas.width;
      const y = (overlay.position.y / 100) * canvas.height;
      context.strokeStyle = "#000000";
      context.strokeText(overlay.text, x, y);
      context.fillStyle = overlay.color;
      context.fillText(overlay.text, x, y);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.94),
      );
      if (!blob) throw new Error("Composite could not be created");
      const file = new File([blob], `thumbnail-overlay-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      if (!uploaded?.file_url) throw new Error("Composite could not be saved");
      await mm.mutateAsync({
        action: "create",
        data: {
          session: active,
          role: "assistant",
          content: `Saved text overlay: ${overlay.text}`,
          imageUrl: uploaded.file_url,
          timestamp: new Date().toISOString(),
        },
      });
      setOverlay(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The text overlay could not be saved",
      );
    } finally {
      setBusy(false);
    }
  };
  const openOverlay = (message) =>
    setOverlay({
      message,
      text: "YOUR TEXT",
      font: "Arial Black, Arial, sans-serif",
      size: 64,
      color: "#ffffff",
      position: { x: 50, y: 50 },
    });
  const imageActions = (message) => (
    <div className="mt-2 flex flex-wrap gap-2">
      <a href={message.imageUrl} download className="agency-button-secondary">
        <Download className="h-4 w-4" />
        Download
      </a>
      <button
        className="agency-button-secondary"
        onClick={() =>
          send(
            "Regenerate the previous thumbnail with the same direction and a fresh composition.",
          )
        }
      >
        <RefreshCw className="h-4 w-4" />
        Regenerate
      </button>
      <button
        className="agency-button-secondary"
        onClick={() => generateVariations(message)}
        disabled={busy}
        title="Create three fresh images from this session's saved creative direction"
      >
        Try 3 variations
      </button>
      <button
        className="agency-button-secondary"
        onClick={() => openOverlay(message)}
      >
        <Type className="h-4 w-4" />
        Add text overlay
      </button>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          aria-label={`Rate ${value} stars`}
          onClick={() => rate(message, value)}
          key={value}
        >
          <Star
            className={`h-4 w-4 ${value <= message.rating ? "fill-[#FF9F0A] text-[#FF9F0A]" : "text-agency-muted"}`}
          />
        </button>
      ))}
    </div>
  );
  return (
    <section className="agency-enter -mb-16 -mt-8 flex min-h-[calc(100vh-72px)] gap-4 sm:-mt-12 lg:-mt-16">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between">
          <h1 className="text-lg font-semibold text-agency-primary">
            Thumbnail studio
          </h1>
          <div className="flex gap-2">
            <select
              className="agency-filter"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            >
              <option value="">Select client</option>
              {clients.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setPanel((v) => !v)}
              className="agency-icon-button h-10 w-10 rounded-xl"
            >
              <PanelRight className="m-auto h-4 w-4" />
            </button>
          </div>
        </header>
        <div
          className={`flex-1 overflow-auto py-5 agency-scrollbar ${rows.length ? "" : "grid place-items-center"}`}
        >
          {rows.length ? (
            <div className="mx-auto max-w-3xl space-y-6 px-4">
              {displayRows.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : ""}`}
                >
                  <div className={`agency-message ${m.role}`}>
                    {m.variations ? (
                      <div>
                        <p className="mb-2 text-sm text-agency-secondary">
                          {variationStatus(m.variations.length).label}
                        </p>
                        <div className="flex max-w-[80vw] snap-x gap-3 overflow-x-auto pb-2 agency-scrollbar">
                          {m.variations.map((variation) => (
                            <div
                              key={variation.id}
                              className="min-w-[min(520px,75vw)] snap-start"
                            >
                              <img
                                src={variation.imageUrl}
                                alt={`Thumbnail variation ${variation.variationIndex}`}
                                className="w-full rounded-2xl"
                              />
                              {imageActions(variation)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : m.imageUrl ? (
                      <div>
                        <img
                          src={m.imageUrl}
                          alt="Generated thumbnail"
                          className="w-full max-w-xl rounded-2xl"
                        />
                        {imageActions(m)}
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="agency-message assistant">
                  Developing direction and generating…
                </div>
              )}
              <div ref={end} />
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-[#64D2FF]" />
              <h2 className="mt-4 text-2xl font-semibold text-agency-primary">
                Create a thumbnail
              </h2>
              <p className="mt-2 text-sm text-agency-muted">
                Select a client, then describe a concept or paste a video topic.
              </p>
            </div>
          )}
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-6">
          {apiMissing && (
            <div className="mb-3">
              <AiUnavailable compact />
            </div>
          )}
          {errorMessage && (
            <div className="mb-3 rounded-xl border border-[#FF453A]/25 bg-[#FF453A]/10 p-3 text-sm text-[#FF8A80]">
              {errorMessage}
            </div>
          )}
          <div className="agency-chat-input">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Describe a thumbnail or paste a video topic..."
            />
            <button onClick={send} disabled={!input.trim() || !client || busy}>
              <Send />
            </button>
          </div>
        </div>
      </div>
      <aside className={`agency-thread-panel ${panel ? "is-open" : ""}`}>
        <h2 className="font-semibold text-agency-primary">Sessions</h2>
        <button
          onClick={() => {
            setActive(null);
            setInput("");
          }}
          className="agency-button-primary mt-4"
        >
          <MessageSquare className="h-4 w-4" />
          New session
        </button>
        <label className="agency-search mt-4">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions…"
          />
        </label>
        <div className="mt-4 space-y-1">
          {sessions.data
            .filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
            .map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActive(s.id);
                  setClient(s.client);
                }}
                className={`agency-thread ${active === s.id ? "is-active" : ""}`}
              >
                <span>{s.title}</span>
                <small>
                  {clients.data.find((c) => c.id === s.client)?.name}
                </small>
              </button>
            ))}
        </div>
      </aside>
      {overlay && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-xl">
          <div className="agency-glass w-full max-w-5xl rounded-[24px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-agency-primary">
                  Text overlay editor
                </h2>
                <p className="text-sm text-agency-muted">
                  Drag the text directly on the thumbnail, then save a new
                  composite.
                </p>
              </div>
              <button
                aria-label="Close text overlay editor"
                className="agency-icon-button"
                onClick={() => setOverlay(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <img
                  src={overlay.message.imageUrl}
                  alt="Thumbnail text overlay preview"
                  className="block aspect-video w-full object-contain"
                />
                <button
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-nowrap bg-transparent px-3 py-2 font-black uppercase leading-none drop-shadow-[0_3px_1px_rgba(0,0,0,0.95)]"
                  style={{
                    left: `${overlay.position.x}%`,
                    top: `${overlay.position.y}%`,
                    color: overlay.color,
                    fontFamily: overlay.font,
                    fontSize: `${Math.max(20, overlay.size / 1.6)}px`,
                    WebkitTextStroke: "2px #000",
                  }}
                  onPointerDown={(event) =>
                    event.currentTarget.setPointerCapture(event.pointerId)
                  }
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId))
                      return;
                    const rect =
                      event.currentTarget.parentElement.getBoundingClientRect();
                    setOverlay((current) => ({
                      ...current,
                      position: clampOverlayPosition({
                        x: ((event.clientX - rect.left) / rect.width) * 100,
                        y: ((event.clientY - rect.top) / rect.height) * 100,
                      }),
                    }));
                  }}
                  onPointerUp={(event) =>
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                >
                  {overlay.text || "YOUR TEXT"}
                </button>
              </div>
              <div className="space-y-4">
                <label className="block text-sm text-agency-secondary">
                  Text
                  <input
                    className="agency-filter mt-1 w-full"
                    value={overlay.text}
                    maxLength={80}
                    onChange={(event) =>
                      setOverlay((current) => ({
                        ...current,
                        text: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm text-agency-secondary">
                  Font
                  <select
                    className="agency-filter mt-1 w-full"
                    value={overlay.font}
                    onChange={(event) =>
                      setOverlay((current) => ({
                        ...current,
                        font: event.target.value,
                      }))
                    }
                  >
                    <option value="Arial Black, Arial, sans-serif">
                      Arial Black
                    </option>
                    <option value="Impact, sans-serif">Impact</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                  </select>
                </label>
                <label className="block text-sm text-agency-secondary">
                  Size: {overlay.size}px
                  <input
                    className="mt-2 w-full accent-[#0A84FF]"
                    type="range"
                    min="28"
                    max="120"
                    step="2"
                    value={overlay.size}
                    onChange={(event) =>
                      setOverlay((current) => ({
                        ...current,
                        size: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="block text-sm text-agency-secondary">
                  Color
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-transparent"
                    type="color"
                    value={overlay.color}
                    onChange={(event) =>
                      setOverlay((current) => ({
                        ...current,
                        color: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  className="agency-button-primary w-full"
                  onClick={saveOverlay}
                  disabled={busy || !overlay.text.trim()}
                >
                  <Save className="h-4 w-4" />
                  Save composite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
