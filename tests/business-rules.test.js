import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyModel } from "../src/lib/finance.js";
import {
  buildAnalyticsSnapshot,
  calculateTeamCapacity,
  groupThumbnailSessions,
} from "../src/lib/operations.js";
import {
  buildVariationPrompts,
  clampOverlayPosition,
  generateAndPersistVariations,
  groupThumbnailMessages,
  isIntegrationUnavailable,
  variationStatus,
} from "../src/lib/thumbnail-tools.js";
import {
  classifyVideo,
  isYouTubeChannelUrl,
  isYouTubeVideoUrl,
  normalizeAnalyzedUploads,
} from "../src/lib/video-rules.js";
import {
  getIntegrationDefinition,
  integrationStatusTone,
  setupCompletion,
} from "../src/lib/integrations.js";

test("classifies the exact four-minute boundary as long-form", () => {
  assert.equal(classifyVideo(239), "SHORT_FORM");
  assert.equal(classifyVideo(240), "LONG_FORM");
  assert.equal(classifyVideo(600), "LONG_FORM");
});

test("accepts YouTube channel URLs and rejects unrelated URLs", () => {
  assert.equal(isYouTubeChannelUrl("https://www.youtube.com/@creator"), true);
  assert.equal(isYouTubeChannelUrl("https://example.com/@creator"), false);
  assert.equal(isYouTubeChannelUrl("not a url"), false);
});

test("accepts only direct YouTube video URLs for analyzed uploads", () => {
  assert.equal(
    isYouTubeVideoUrl("https://www.youtube.com/watch?v=abcdefghijk"),
    true,
  );
  assert.equal(isYouTubeVideoUrl("https://youtu.be/abcdefghijk"), true);
  assert.equal(
    isYouTubeVideoUrl("https://youtube.com/watch?v=example1"),
    false,
  );
  assert.equal(isYouTubeVideoUrl("https://youtu.be/example2"), false);
  assert.equal(isYouTubeVideoUrl("https://www.youtube.com/@creator"), false);
  assert.equal(isYouTubeVideoUrl("https://example.com/watch?v=abc123"), false);
});

test("drops unverifiable uploads and classifies the four-minute boundary", () => {
  const uploads = normalizeAnalyzedUploads([
    {
      title: "Channel link",
      url: "https://www.youtube.com/@creator",
      durationSeconds: 500,
    },
    {
      title: "Short",
      url: "https://youtu.be/short123456",
      durationSeconds: 239,
    },
    {
      title: "Long",
      url: "https://www.youtube.com/watch?v=long1234567",
      durationSeconds: "240",
    },
    {
      title: "Missing duration",
      url: "https://www.youtube.com/watch?v=unknown",
    },
  ]);
  assert.deepEqual(
    uploads.map((video) => [video.title, video.durationSeconds, video.format]),
    [
      ["Short", 239, "SHORT_FORM"],
      ["Long", 240, "LONG_FORM"],
    ],
  );
});

test("derives MRR, paid revenue, costs, profit, and setup status from source records", () => {
  const model = buildMoneyModel(
    [
      { id: "a", status: "ACTIVE", monthlyFee: 5000, startDate: "2026-01-01" },
      { id: "b", status: "CHURNED", monthlyFee: 9000 },
    ],
    [
      { client: "a", type: "SETUP", status: "PAID", amount: 30000 },
      {
        client: "a",
        type: "MONTHLY",
        status: "PENDING",
        amount: 5000,
        dueDate: "2026-09-01",
      },
    ],
    [
      { client: "a", cost: 1200 },
      { client: "a", cost: 800 },
    ],
    new Date("2026-09-28T12:00:00Z"),
  );
  assert.equal(model.mrr, 5000);
  assert.equal(model.totalRevenue, 30000);
  assert.equal(model.totalCost, 2000);
  assert.equal(model.profit, 3000);
  assert.equal(model.breakdown[0].setupPaid, true);
  assert.equal(model.trackedPayments[1].displayStatus, "OVERDUE");
  assert.equal(model.collection, 50);
});

test("does not fabricate MRR history when no client start dates exist", () => {
  const model = buildMoneyModel(
    [{ id: "a", status: "ACTIVE", monthlyFee: 5000 }],
    [],
    [],
  );
  assert.deepEqual(model.months, []);
});

test("normalizes a YouTube analytics import into an AnalyticsSnapshot", () => {
  assert.deepEqual(
    buildAnalyticsSnapshot(
      "client-1",
      {
        views: "1200",
        subscribers: "42",
        topVideos: [{ title: "A", views: "99" }],
      },
      "2026-09-29",
    ),
    {
      client: "client-1",
      date: "2026-09-29",
      views: 1200,
      subscribers: 42,
      watchHours: 0,
      impressionsCTR: 0,
      topVideos: '[{"title":"A","views":99}]',
    },
  );
});

test("groups thumbnail sessions by client and calculates named-member capacity", () => {
  assert.deepEqual(groupThumbnailSessions([{ id: "s", client: "c" }]), {
    c: [{ id: "s", client: "c" }],
  });
  assert.deepEqual(
    calculateTeamCapacity([
      { name: "Alex", client: "a" },
      { name: "Alex", client: "b" },
    ]),
    [{ name: "Alex", clients: 2, overloaded: false }],
  );
});

test("groups persisted thumbnail variations and constrains overlay positions", () => {
  const rows = groupThumbnailMessages([
    { id: "intro", role: "assistant", content: "Direction" },
    { id: "v2", variationGroup: "g", variationIndex: 2, imageUrl: "two" },
    { id: "v1", variationGroup: "g", variationIndex: 1, imageUrl: "one" },
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows[1].variations.map((item) => item.imageUrl),
    ["one", "two"],
  );
  assert.deepEqual(clampOverlayPosition({ x: -20, y: 120 }), { x: 5, y: 95 });
  assert.equal(buildVariationPrompts("Red box").length, 3);
  assert.match(buildVariationPrompts("Red box")[2], /variation 3 of 3/i);
  assert.deepEqual(variationStatus(2), {
    complete: false,
    label: "2 of 3 variations saved",
  });
  assert.equal(variationStatus(3).complete, true);
  assert.equal(isIntegrationUnavailable(new Error("AI_NOT_CONFIGURED")), true);
  assert.equal(
    isIntegrationUnavailable("DISCORD_BOT_TOKEN is not configured"),
    true,
  );
  assert.equal(isIntegrationUnavailable(new Error("Network timeout")), false);
});

test("persists successful variations and reports individual failures", async () => {
  const generated = [];
  const persisted = [];
  const result = await generateAndPersistVariations({
    prompts: ["one", "two", "three"],
    generate: async (prompt, index) => {
      generated.push([prompt, index]);
      if (index === 1) throw new Error("AI_NOT_CONFIGURED");
      return `image-${index}`;
    },
    persist: async (image, index) => persisted.push([image, index]),
  });
  assert.equal(generated.length, 3);
  assert.deepEqual(persisted, [
    ["image-0", 0],
    ["image-2", 2],
  ]);
  assert.equal(result.saved, 2);
  assert.equal(result.failures.length, 1);
  assert.equal(result.missingIntegration, true);
});

test("provides secure integration guides and checklist progress", () => {
  const discord = getIntegrationDefinition("DISCORD");
  assert.equal(discord.minutes, 5);
  assert.match(discord.steps.join(" "), /Message Content Intent/i);
  assert.equal(discord.secretNames.includes("DISCORD_BOT_TOKEN"), true);
  assert.deepEqual(setupCompletion([true, false, true], 3), {
    complete: 2,
    percent: 67,
    total: 3,
  });
  assert.equal(integrationStatusTone("connected"), "green");
  assert.equal(integrationStatusTone("error"), "red");
  assert.equal(integrationStatusTone("missing"), "neutral");
});
