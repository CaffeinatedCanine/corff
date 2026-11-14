const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { getConfig } = require("../config");

const STORE_PATH = path.join(__dirname, "..", "data", "drafts.json");

let cache = null;

function formatTimestamp(value = new Date()) {
  return new Date(value == null ? Date.now() : value).toISOString();
}

function normalizeDraft(draft) {
  const defaultTimezone = getConfig().timezone;

  return {
    targetChannelId: null,
    ...draft,
    mentionRoleId:
      typeof draft?.mentionRoleId === "string" && draft.mentionRoleId
        ? draft.mentionRoleId
        : null,
    editorIds: Array.isArray(draft?.editorIds)
      ? [...new Set(draft.editorIds.filter(Boolean).map(String))]
      : [],
    scheduleTimezone:
      typeof draft?.scheduleTimezone === "string" && draft.scheduleTimezone
        ? draft.scheduleTimezone
        : defaultTimezone,
  };
}

function ensureStoreFile() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ drafts: [] }, null, 2));
  }
}

function loadStore() {
  if (cache) {
    return cache;
  }

  ensureStoreFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    cache = {
      drafts: Array.isArray(parsed?.drafts)
        ? parsed.drafts.map(normalizeDraft)
        : [],
    };
  } catch {
    cache = { drafts: [] };
  }

  return cache;
}

function saveStore(store) {
  cache = {
    drafts: store.drafts.map(normalizeDraft),
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(cache, null, 2));
}

function getAllDrafts() {
  return [...loadStore().drafts];
}

function getDraftById(draftId) {
  return loadStore().drafts.find((draft) => draft.id === draftId) || null;
}

function createDraft(data) {
  const store = loadStore();
  const now = formatTimestamp();
  const draft = normalizeDraft({
    id: randomUUID(),
    status: data.scheduledAt ? "scheduled" : "draft",
    createdAt: now,
    updatedAt: now,
    postedAt: null,
    postedMessageId: null,
    postedThreadId: null,
    previewContentMessageId: null,
    previewMessageId: null,
    previewChannelId: null,
    ...data,
  });

  store.drafts.push(draft);
  saveStore(store);
  return draft;
}

function updateDraft(draftId, updater, options = {}) {
  const store = loadStore();
  const index = store.drafts.findIndex((draft) => draft.id === draftId);
  if (index < 0) {
    throw new Error("Draft not found.");
  }

  const current = store.drafts[index];
  const next =
    typeof updater === "function"
      ? updater({ ...current })
      : { ...current, ...updater };

  store.drafts[index] = normalizeDraft({
    ...current,
    ...next,
    updatedAt:
      options.touchUpdatedAt === false ? current.updatedAt : formatTimestamp(),
  });
  saveStore(store);
  return store.drafts[index];
}

function listDueDrafts(nowMs = Date.now()) {
  return getAllDrafts().filter(
    (draft) =>
      draft.status !== "posted" &&
      Number.isFinite(draft.scheduledAt) &&
      draft.scheduledAt <= nowMs,
  );
}

module.exports = {
  createDraft,
  getAllDrafts,
  getDraftById,
  listDueDrafts,
  updateDraft,
};
