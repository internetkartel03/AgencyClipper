export const LONG_FORM_MIN_SECONDS = 240;

export function classifyVideo(durationSeconds) {
  return Number(durationSeconds) >= LONG_FORM_MIN_SECONDS
    ? "LONG_FORM"
    : "SHORT_FORM";
}

export function isYouTubeVideoUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const videoId =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
              url.hostname,
            ) && url.pathname === "/watch"
          ? url.searchParams.get("v")
          : null;

    return /^[A-Za-z0-9_-]{11}$/.test(videoId || "");
  } catch {
    return false;
  }
}

export function normalizeAnalyzedUploads(uploads) {
  if (!Array.isArray(uploads)) return [];
  return uploads
    .filter(
      (video) =>
        video &&
        typeof video.title === "string" &&
        isYouTubeVideoUrl(video.url) &&
        Number.isFinite(Number(video.durationSeconds)) &&
        Number(video.durationSeconds) >= 0,
    )
    .map((video) => ({
      ...video,
      durationSeconds: Number(video.durationSeconds),
      format: classifyVideo(video.durationSeconds),
    }));
}

export function isYouTubeChannelUrl(value) {
  try {
    const url = new URL(value);
    return (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
        url.hostname,
      ) && Boolean(url.pathname.replaceAll("/", ""))
    );
  } catch {
    return false;
  }
}
