const { getConfig } = require("./config");
const { handleDraftInteraction } = require("./handlers/interactions");
const { processDueDrafts, startScheduler } = require("./scheduler");

function initDrafts(client) {
  const config = getConfig();
  if (!config.enabled) {
    console.log("[Drafts] Disabled by configuration.");
    return;
  }

  startScheduler(client);
  client.once("clientReady", async () => {
    try {
      await processDueDrafts(client);
    } catch (err) {
      console.error("[Drafts] Startup processing failed:", err);
    }
  });
  console.log("[Drafts] Scheduler initialized.");
}

module.exports = {
  initDrafts,
  handleInteraction: handleDraftInteraction,
};
