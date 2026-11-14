const { getConfig } = require("./config");
const { listDueDrafts } = require("./services/store");
const { postDraftNow } = require("./services/posting");

let intervalHandle = null;
let isRunning = false;

async function processDueDrafts(client) {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    const dueDrafts = listDueDrafts(Date.now());
    for (const draft of dueDrafts) {
      try {
        await postDraftNow(client, draft.id);
      } catch (err) {
        console.error(
          `[Drafts] Failed to post scheduled draft ${draft.id}:`,
          err,
        );
      }
    }
  } finally {
    isRunning = false;
  }
}

function startScheduler(client) {
  const config = getConfig();
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  intervalHandle = setInterval(
    () =>
      processDueDrafts(client).catch((err) => {
        console.error("[Drafts] Scheduler tick failed:", err);
      }),
    config.schedulerIntervalSeconds * 1000,
  );
}

module.exports = {
  processDueDrafts,
  startScheduler,
};
