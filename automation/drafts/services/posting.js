const { ChannelType } = require("discord.js");
const {
  buildDraftPostedEmbed,
  buildGalleryEmbeds,
  buildPreviewMessage,
} = require("../utils/ui");
const { updateDraft } = require("./store");

async function fetchTextChannel(client, channelId) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || typeof channel.send !== "function") {
    throw new Error("Could not fetch a text channel for this draft.");
  }
  return channel;
}

async function syncPreviewMessage(client, draft) {
  if (!draft.previewChannelId) {
    return draft;
  }

  try {
    const previewChannel = await fetchTextChannel(
      client,
      draft.previewChannelId,
    );

    let previewMessage = null;
    if (draft.previewContentMessageId) {
      previewMessage = await previewChannel.messages
        .fetch(draft.previewContentMessageId)
        .catch(() => null);
    }

    if (!previewMessage && draft.previewMessageId) {
      previewMessage = await previewChannel.messages
        .fetch(draft.previewMessageId)
        .catch(() => null);
    }

    if (!previewMessage) {
      return draft;
    }

    await previewMessage.edit(buildPreviewMessage(draft));

    const staleMessageIds = [
      ...new Set([draft.previewContentMessageId, draft.previewMessageId]),
    ].filter((messageId) => messageId && messageId !== previewMessage.id);

    await Promise.all(
      staleMessageIds.map(async (messageId) => {
        const staleMessage = await previewChannel.messages
          .fetch(messageId)
          .catch(() => null);
        if (staleMessage) {
          await staleMessage.delete().catch(() => null);
        }
      }),
    );

    if (
      draft.previewMessageId !== previewMessage.id ||
      draft.previewContentMessageId
    ) {
      return updateDraft(
        draft.id,
        {
          previewMessageId: previewMessage.id,
          previewContentMessageId: null,
        },
        { touchUpdatedAt: false },
      );
    }
  } catch (err) {
    console.warn("[Drafts] Failed to sync preview message:", err.message);
  }

  return draft;
}

function buildTargetMessagePayload(draft) {
  if (draft.kind === "post") {
    return {
      content: draft.payload.text,
      embeds: buildGalleryEmbeds(draft),
    };
  }

  return {
    content: draft.mentionRoleId ? `<@&${draft.mentionRoleId}>` : "",
    allowedMentions: draft.mentionRoleId
      ? { roles: [draft.mentionRoleId] }
      : { parse: [] },
    embeds: [buildDraftPostedEmbed(draft), ...buildGalleryEmbeds(draft)],
  };
}

function deriveForumPostName(draft) {
  const raw =
    draft.kind === "post"
      ? draft.payload.text
      : draft.payload.title || draft.payload.body;
  const name = String(raw || "Draft Post")
    .replace(/\s+/g, " ")
    .trim();
  return (name || "Draft Post").slice(0, 100);
}

// Forum channels can't receive messages directly — a new post (thread) has
// to be created for them. Returns the thread id so future edits can find
// the same post instead of creating a new one each time.
async function sendDraftToTarget(client, draft) {
  const targetChannel = await client.channels
    .fetch(draft.targetChannelId)
    .catch(() => null);
  if (!targetChannel) {
    throw new Error("Could not fetch a channel for this draft.");
  }

  const payload = buildTargetMessagePayload(draft);

  if (targetChannel.type === ChannelType.GuildForum) {
    const thread = await targetChannel.threads.create({
      name: deriveForumPostName(draft),
      message: payload,
      reason: "Draft posted to forum",
    });
    const starterMessage = await thread.fetchStarterMessage();
    return { message: starterMessage, threadId: thread.id };
  }

  if (typeof targetChannel.send !== "function") {
    throw new Error(
      "Could not post to that channel — it doesn't support messages.",
    );
  }

  const message = await targetChannel.send(payload);
  return { message, threadId: null };
}

async function syncPostedMessage(client, draft) {
  if (draft.status !== "posted" || !draft.postedMessageId) {
    return draft;
  }

  const targetChannel = await fetchTextChannel(
    client,
    draft.postedThreadId || draft.targetChannelId,
  );
  const postedMessage = await targetChannel.messages
    .fetch(draft.postedMessageId)
    .catch(() => null);

  if (!postedMessage) {
    throw new Error("Could not find the live post. It may have been deleted.");
  }

  await postedMessage.edit(buildTargetMessagePayload(draft));
  return draft;
}

async function postDraftNow(client, draftId) {
  let draft = updateDraft(draftId, (current) => {
    if (current.status === "posted") {
      throw new Error("This draft has already been posted.");
    }
    if (!current.targetChannelId) {
      throw new Error(
        "Select a destination channel in Schedule before posting this draft.",
      );
    }
    return current;
  });

  const { message: postedMessage, threadId } = await sendDraftToTarget(
    client,
    draft,
  );
  draft = updateDraft(draftId, {
    status: "posted",
    scheduledAt: null,
    postedAt: new Date().toISOString(),
    postedMessageId: postedMessage.id,
    postedThreadId: threadId,
  });
  await syncPreviewMessage(client, draft);
  return { draft, postedMessage };
}

module.exports = {
  postDraftNow,
  syncPostedMessage,
  syncPreviewMessage,
};
