export const integrationDefinitions = [
  {
    key: "AI_PROVIDER",
    name: "Built-in AI",
    minutes: 1,
    required: true,
    secretNames: [],
    description:
      "Powers ideation, training, channel analysis, and Discord reasoning through Base44's server-side AI.",
    steps: [
      "Open Settings and confirm the status reads Built in.",
      "Use Test connection to verify the authenticated backend status function.",
      "Keep AI calls in backend functions; never place provider credentials in browser code.",
    ],
  },
  {
    key: "HIGGSFIELD",
    name: "Higgsfield",
    minutes: 3,
    required: false,
    secretNames: ["HF_API_KEY_ID", "HF_API_KEY_SECRET"],
    description:
      "Planned thumbnail provider. Setup is pending; Cloudflare continues generating thumbnails until the switch is completed.",
    steps: [
      "Create an API key ID and matching secret at https://console.higgsfield.ai/.",
      "Add HF_API_KEY_ID and HF_API_KEY_SECRET in the app dashboard’s Secrets page, not in an app record.",
      "Higgsfield generation and connection testing remain unavailable until the integration is completed.",
      "Ask the app builder to complete the Higgsfield switch once credentials are saved. Keep Cloudflare configured as an alternative.",
    ],
  },
  {
    key: "CLOUDFLARE",
    name: "Cloudflare Workers AI",
    minutes: 3,
    required: false,
    secretNames: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
    description:
      "Generates 16:9 thumbnails with FLUX Schnell using server-side credentials.",
    steps: [
      "In Cloudflare, copy the Account ID for the account with Workers AI enabled.",
      "Create an API token limited to Workers AI read and edit access.",
      "Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Base44 Secrets.",
      "Return here and use Test connection; never paste either value into an app record.",
    ],
  },
  {
    key: "YOUTUBE",
    name: "YouTube Data API",
    minutes: 5,
    required: false,
    secretNames: ["YOUTUBE_API_KEY"],
    description:
      "Imports public channel statistics and recent upload metadata for analytics and analysis.",
    steps: [
      "Open Google Cloud Console and enable YouTube Data API v3 for the selected project.",
      "Create an API key and restrict it to YouTube Data API v3.",
      "Add YOUTUBE_API_KEY in Base44 Secrets, not AppSetting or browser storage.",
      "Use Test connection, then pull a known channel from Analytics.",
    ],
  },
  {
    key: "DISCORD",
    name: "Discord bot",
    minutes: 5,
    required: false,
    secretNames: ["DISCORD_BOT_TOKEN"],
    description:
      "Reads production messages every 30 minutes and updates ClientProgress without sending messages.",
    steps: [
      "Create or open the agency bot in the Discord Developer Portal.",
      "Enable Message Content Intent under Bot settings.",
      "Invite the bot with read-only View Channels and Read Message History permissions.",
      "Add DISCORD_BOT_TOKEN in Base44 Secrets and keep the token out of records and logs.",
      "Match each Discord server name exactly to its Client name, then use Test connection.",
    ],
  },
  {
    key: "NOTION",
    name: "Notion",
    minutes: 4,
    required: false,
    secretNames: ["NOTION_TOKEN"],
    description:
      "Optional connector for agency documentation and workspace handoff.",
    steps: [
      "Create an internal Notion integration for the agency workspace.",
      "Share only the required pages with that integration.",
      "Add NOTION_TOKEN in Base44 Secrets or use the approved Base44 connector flow.",
      "Use Test connection and confirm the status without exposing the token.",
    ],
  },
];

export function getIntegrationDefinition(key) {
  return integrationDefinitions.find((integration) => integration.key === key);
}

export function integrationStatusTone(state) {
  if (state === "connected") return "green";
  if (state === "error") return "red";
  if (state === "available") return "blue";
  return "neutral";
}

export function setupCompletion(completed = [], total = completed.length) {
  const complete = completed.slice(0, total).filter(Boolean).length;
  return {
    complete,
    percent: total ? Math.round((complete / total) * 100) : 0,
    total,
  };
}