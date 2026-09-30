import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyModel } from "../src/lib/finance.js";
import {
  buildAnalyticsSnapshot,
  calculateTeamCapacity,
  groupThumbnailSessions,
} from "../src/lib/operations.js";
import {
  classifyVideo,
  isYouTubeChannelUrl,
  isYouTubeVideoUrl,
  normalizeAnalyzedUploads,
} from "../src/lib/video-rules.js";

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
