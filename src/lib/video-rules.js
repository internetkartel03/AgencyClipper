export const LONG_FORM_MIN_SECONDS = 240;

export function classifyVideo(durationSeconds) {
  return Number(durationSeconds) >= LONG_FORM_MIN_SECONDS ? 'LONG_FORM' : 'SHORT_FORM';
}

export function isYouTubeChannelUrl(value) {
  try {
    const url = new URL(value);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) && Boolean(url.pathname.replaceAll('/', ''));
  } catch { return false; }
}
