function parseBoolean(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInteger(value, fallback, min, max) {
  const parsed = parseInteger(value, fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function getConfig() {
  return {
    enabled: parseBoolean(process.env.DRAFTS_ENABLED, true),
    modChannelId:
      process.env.DRAFT_MOD_CHANNEL_ID ||
      process.env.FICCLUB_MOD_CHANNEL_ID ||
      null,
    timezone:
      process.env.DRAFTS_TIMEZONE ||
      process.env.FICCLUB_TIMEZONE ||
      "Europe/Stockholm",
    schedulerIntervalSeconds: clampInteger(
      process.env.DRAFTS_SCHEDULER_INTERVAL_SECONDS,
      30,
      10,
      300,
    ),
  };
}

module.exports = {
  getConfig,
};
