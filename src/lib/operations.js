export function buildAnalyticsSnapshot(
  client,
  analytics,
  date = new Date().toISOString().slice(0, 10),
) {
  const topVideos = Array.isArray(analytics?.topVideos)
    ? analytics.topVideos.map((video) => ({
        ...video,
        views: Number(video.views) || 0,
      }))
    : [];
  return {
    client,
    date,
    views: Number(analytics?.views) || 0,
    subscribers: Number(analytics?.subscribers) || 0,
    watchHours: Number(analytics?.watchHours) || 0,
    impressionsCTR: Number(analytics?.impressionsCTR) || 0,
    topVideos: JSON.stringify(topVideos),
  };
}

export function groupThumbnailSessions(sessions = []) {
  return sessions.reduce((groups, session) => {
    (groups[session.client] ||= []).push(session);
    return groups;
  }, {});
}

export function calculateTeamCapacity(members = []) {
  const assignments = new Map();
  members.forEach(({ name, client }) => {
    if (!assignments.has(name)) assignments.set(name, new Set());
    assignments.get(name).add(client);
  });
  return [...assignments].map(([name, clients]) => ({
    name,
    clients: clients.size,
    overloaded: clients.size >= 4,
  }));
}
