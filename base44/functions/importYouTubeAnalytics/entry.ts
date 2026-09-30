import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });
    const { channel } = await req.json();
    const key = Deno.env.get("YOUTUBE_API_KEY");
    if (!key)
      return Response.json(
        { error: "YOUTUBE_API_KEY is not configured" },
        { status: 503 },
      );
    const value = String(channel || "").trim();
    const search = value.startsWith("UC")
      ? { items: [{ id: value }] }
      : await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(value)}&key=${key}`,
        ).then((r) => r.json());
    const channelId = search.items?.[0]?.id?.channelId || search.items?.[0]?.id;
    if (!channelId)
      return Response.json(
        { error: "YouTube channel not found" },
        { status: 404 },
      );
    const channelData = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${key}`,
    ).then((r) => r.json());
    const item = channelData.items?.[0];
    if (!item)
      return Response.json(
        { error: "YouTube channel not found" },
        { status: 404 },
      );
    const playlist = item.contentDetails?.relatedPlaylists?.uploads;
    const uploads = playlist
      ? await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlist}&maxResults=10&key=${key}`,
        ).then((r) => r.json())
      : { items: [] };
    const ids = (uploads.items || [])
      .map((v: any) => v.snippet?.resourceId?.videoId)
      .filter(Boolean);
    const videos = ids.length
      ? await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}&key=${key}`,
        ).then((r) => r.json())
      : { items: [] };
    return Response.json({
      channelId,
      name: item.snippet?.title,
      views: Number(item.statistics?.viewCount) || 0,
      subscribers: Number(item.statistics?.subscriberCount) || 0,
      topVideos: (videos.items || [])
        .map((v: any) => ({
          title: v.snippet?.title,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          views: Number(v.statistics?.viewCount) || 0,
        }))
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 5),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "YouTube import failed",
      },
      { status: 500 },
    );
  }
}
