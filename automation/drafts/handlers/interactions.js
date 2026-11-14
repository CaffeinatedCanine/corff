const { PermissionFlagsBits } = require("discord.js");
const {
  buildEditModal,
  buildImagesModal,
  buildPreviewMessage,
  buildRoleTagModal,
  buildScheduleModal,
  getButtonAction,
  getCreateContext,
  getEditContext,
  getImagesDraftId,
  getPreviewChannelId,
  getRoleTagDraftId,
  getScheduleDraftId,
  isDraftModal,
  isValidTargetChannel,
  parseEmbedModal,
  parseImagesModal,
  parsePostModal,
  parseRoleTagModal,
  parseScheduleModal,
} = require("../utils/ui");
const { createDraft, getDraftById, updateDraft } = require("../services/store");
const {
  postDraftNow,
  syncPostedMessage,
  syncPreviewMessage,
} = require("../services/posting");

function mergeEditorIds(draft, userId) {
  if (!userId || userId === draft.creatorId) {
    return draft.editorIds || [];
  }

  return [...new Set([...(draft.editorIds || []), userId])];
}

async function createPreviewMessage(interaction, draft) {
  const previewChannelId = getPreviewChannelId(interaction);
  const previewChannel =
    await interaction.client.channels.fetch(previewChannelId);
  if (!previewChannel || typeof previewChannel.send !== "function") {
    throw new Error("Could not fetch the mod channel for draft previews.");
  }

  const previewMessage = await previewChannel.send(buildPreviewMessage(draft));

  return updateDraft(
    draft.id,
    {
      previewChannelId,
      previewContentMessageId: null,
      previewMessageId: previewMessage.id,
    },
    { touchUpdatedAt: false },
  );
}

async function handleCreateDraftModal(interaction, context) {
  await interaction.deferReply({ flags: 64 });

  const payload =
    context.kind === "embed"
      ? parseEmbedModal(interaction)
      : parsePostModal(interaction);

  const draft = createDraft({
    kind: context.kind,
    guildId: interaction.guildId,
    creatorId: interaction.user.id,
    creatorUsername: interaction.user.username,
    targetChannelId: null,
    payload,
    scheduledAt: null,
    editorIds: [],
  });

  const savedDraft = await createPreviewMessage(interaction, draft);
  await interaction.editReply(
    `Draft saved in <#${savedDraft.previewChannelId}>. Choose the destination channel in Schedule.`,
  );
  return true;
}

async function handleEditDraftModal(interaction, context) {
  await interaction.deferReply({ flags: 64 });

  const draft = getDraftById(context.draftId);
  if (!draft) {
    await interaction.editReply("Draft not found.");
    return true;
  }

  const payload =
    context.kind === "embed"
      ? parseEmbedModal(interaction)
      : parsePostModal(interaction);
  const updated = updateDraft(draft.id, (current) => ({
    payload,
    editorIds: mergeEditorIds(current, interaction.user.id),
  }));
  await syncPreviewMessage(interaction.client, updated);

  if (updated.status === "posted") {
    try {
      await syncPostedMessage(interaction.client, updated);
      await interaction.editReply(
        "Draft updated. The live post was edited to match.",
      );
    } catch (error) {
      console.error("[Drafts] Failed to sync posted message:", error);
      await interaction.editReply(
        `Draft updated, but I couldn't edit the live post: ${error.message}`,
      );
    }
    return true;
  }

  await interaction.editReply("Draft updated.");
  return true;
}

async function handleRoleTagModal(interaction, draftId) {
  await interaction.deferReply({ flags: 64 });

  const draft = getDraftById(draftId);
  if (!draft) {
    await interaction.editReply("Draft not found.");
    return true;
  }

  const mentionRoleId = parseRoleTagModal(interaction);
  const updated = updateDraft(draft.id, (current) => ({
    mentionRoleId,
    editorIds: mergeEditorIds(current, interaction.user.id),
  }));
  await syncPreviewMessage(interaction.client, updated);

  const summary = mentionRoleId
    ? `Role tag set to <@&${mentionRoleId}>.`
    : "Role tag cleared.";

  if (updated.status === "posted") {
    try {
      await syncPostedMessage(interaction.client, updated);
      await interaction.editReply(
        `${summary} The live post was edited to match.`,
      );
    } catch (error) {
      console.error("[Drafts] Failed to sync posted message:", error);
      await interaction.editReply(
        `${summary} but I couldn't edit the live post: ${error.message}`,
      );
    }
    return true;
  }

  await interaction.editReply(summary);
  return true;
}

async function handleImagesModal(interaction, draftId) {
  await interaction.deferReply({ flags: 64 });

  const draft = getDraftById(draftId);
  if (!draft) {
    await interaction.editReply("Draft not found.");
    return true;
  }

  const images = parseImagesModal(interaction);
  const restPayload = { ...draft.payload };
  delete restPayload.image; // legacy single-image field
  const updated = updateDraft(draft.id, (current) => ({
    payload: { ...restPayload, images },
    editorIds: mergeEditorIds(current, interaction.user.id),
  }));
  await syncPreviewMessage(interaction.client, updated);

  const summary = images.length
    ? `${images.length} image${images.length === 1 ? "" : "s"} saved.`
    : "Images removed.";

  if (updated.status === "posted") {
    try {
      await syncPostedMessage(interaction.client, updated);
      await interaction.editReply(
        `${summary} The live post was edited to match.`,
      );
    } catch (error) {
      console.error("[Drafts] Failed to sync posted message:", error);
      await interaction.editReply(
        `${summary} but I couldn't edit the live post: ${error.message}`,
      );
    }
    return true;
  }

  await interaction.editReply(summary);
  return true;
}

async function handleScheduleModal(interaction, draftId) {
  await interaction.deferReply({ flags: 64 });

  const draft = getDraftById(draftId);
  if (!draft) {
    await interaction.editReply("Draft not found.");
    return true;
  }

  const { mentionRoleId, scheduledAt, scheduleTimezone, targetChannelId } =
    parseScheduleModal(interaction, draft);
  const targetChannel = await interaction.guild.channels
    .fetch(targetChannelId)
    .catch(() => null);
  if (!isValidTargetChannel(targetChannel)) {
    await interaction.editReply("Pick a valid text-based target channel.");
    return true;
  }

  const updated = updateDraft(draft.id, (current) => ({
    mentionRoleId: current.kind === "embed" ? mentionRoleId : null,
    targetChannelId,
    scheduleTimezone,
    scheduledAt,
    status: scheduledAt ? "scheduled" : "draft",
    editorIds: mergeEditorIds(current, interaction.user.id),
  }));
  await syncPreviewMessage(interaction.client, updated);

  if (scheduledAt) {
    await interaction.editReply(
      `Draft scheduled for <#${updated.targetChannelId}> in ${updated.scheduleTimezone}.${updated.kind === "embed" && updated.mentionRoleId ? ` Role tag: <@&${updated.mentionRoleId}>.` : ""}`,
    );
    return true;
  }

  await interaction.editReply(
    draft.scheduledAt
      ? `Draft schedule cleared. Destination remains <#${updated.targetChannelId}>. Timezone: ${updated.scheduleTimezone}.${updated.kind === "embed" && updated.mentionRoleId ? ` Role tag: <@&${updated.mentionRoleId}>.` : ""}`
      : `Draft destination set to <#${updated.targetChannelId}>. Timezone: ${updated.scheduleTimezone}.${updated.kind === "embed" && updated.mentionRoleId ? ` Role tag: <@&${updated.mentionRoleId}>.` : ""}`,
  );
  return true;
}

async function handleDraftButton(interaction, action) {
  const draft = getDraftById(action.draftId);
  if (!draft) {
    await interaction.reply({
      content: "Draft not found.",
      flags: 64,
    });
    return true;
  }

  if (action.action === "edit") {
    await interaction.showModal(buildEditModal(draft));
    return true;
  }

  if (action.action === "schedule") {
    await interaction.showModal(buildScheduleModal(draft, interaction.guild));
    return true;
  }

  if (action.action === "roletag") {
    await interaction.showModal(buildRoleTagModal(draft));
    return true;
  }

  if (action.action === "image") {
    await interaction.showModal(buildImagesModal(draft));
    return true;
  }

  if (action.action === "post") {
    if (!draft.targetChannelId) {
      await interaction.reply({
        content: "Select a destination channel in Schedule first.",
        flags: 64,
      });
      return true;
    }

    await interaction.deferReply({ flags: 64 });
    const { draft: postedDraft } = await postDraftNow(
      interaction.client,
      draft.id,
    );
    await interaction.editReply(
      `Draft posted to <#${postedDraft.postedThreadId || postedDraft.targetChannelId}>.`,
    );
    return true;
  }

  return false;
}

// Buttons and modals aren't covered by the slash command permission
async function denyIfNotMod(interaction) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    return false;
  }

  await interaction.reply({
    content: "Only moderators can manage drafts.",
    flags: 64,
  });
  return true;
}

async function handleDraftInteraction(interaction) {
  if (interaction.isModalSubmit() && isDraftModal(interaction.customId)) {
    if (await denyIfNotMod(interaction)) {
      return true;
    }

    const createContext = getCreateContext(interaction.customId);
    if (createContext) {
      return handleCreateDraftModal(interaction, createContext);
    }

    const editContext = getEditContext(interaction.customId);
    if (editContext) {
      return handleEditDraftModal(interaction, editContext);
    }

    const scheduleDraftId = getScheduleDraftId(interaction.customId);
    if (scheduleDraftId) {
      return handleScheduleModal(interaction, scheduleDraftId);
    }

    const roleTagDraftId = getRoleTagDraftId(interaction.customId);
    if (roleTagDraftId) {
      return handleRoleTagModal(interaction, roleTagDraftId);
    }

    const imagesDraftId = getImagesDraftId(interaction.customId);
    if (imagesDraftId) {
      return handleImagesModal(interaction, imagesDraftId);
    }
  }

  if (interaction.isButton()) {
    const action = getButtonAction(interaction.customId);
    if (action) {
      if (await denyIfNotMod(interaction)) {
        return true;
      }

      return handleDraftButton(interaction, action);
    }
  }

  return false;
}

module.exports = {
  handleDraftInteraction,
};
