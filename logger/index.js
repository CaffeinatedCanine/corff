require("dotenv").config();
const { AttachmentBuilder } = require("discord.js");
const extractMessageData = require("./extractMessage.js");
const buildEditEmbed = require("./embeds/editEmbed.js");
const buildDeleteEmbed = require("./embeds/deleteEmbed.js");
const buildBulkDeleteEmbed = require("./embeds/bulkDeleteEmbed.js");
const getLogChannel = require("./getLogChannel.js");

// Track recently bulk-deleted message IDs to prevent double-logging
const recentlyBulkDeleted = new Map();

async function fetchImageBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error("Failed to fetch image:", error);
    return null;
  }
}

async function logMessageEdit(oldMessage, newMessage) {
  if (oldMessage.partial) return;

  const contentChanged = oldMessage.content !== newMessage.content;
  const attachmentsChanged =
    oldMessage.attachments.size !== newMessage.attachments.size;

  if (!contentChanged && !attachmentsChanged) return;

  const logChannel = getLogChannel(oldMessage.guild, "message");
  if (!logChannel) return;

  try {
    const embed = buildEditEmbed(extractMessageData(oldMessage), newMessage);

    const files = [];
    for (const attachment of oldMessage.attachments.values()) {
      if (attachment.contentType?.startsWith("image/")) {
        const buffer = await fetchImageBuffer(attachment.url);
        if (buffer) {
          files.push(new AttachmentBuilder(buffer, { name: attachment.name }));
        }
      }
    }

    await logChannel.send({ embeds: [embed], files });
  } catch (error) {
    console.error("Failed to send edit log:", error);
  }
}

async function logMessageDelete(message) {
  if (message.partial) return;
  if (
    !message.content &&
    message.attachments.size === 0 &&
    message.embeds.length === 0
  )
    return;

  // Check if this was part of a bulk delete (bot command)
  const bulkDeleteInfo = recentlyBulkDeleted.get(message.id);
  if (bulkDeleteInfo) {
    recentlyBulkDeleted.delete(message.id);
    return;
  }

  const logChannel = getLogChannel(message.guild, "message");
  if (!logChannel) return;

  try {
    // Fetch audit log to find who deleted this message
    let executor = null;
    let deleteType = "self"; // default: self-delete

    try {
      const auditLogs = await message.guild.fetchAuditLogs({
        limit: 1,
        type: 72,
      });
      const deleteLog = auditLogs.entries.first();

      if (deleteLog && deleteLog.target.id === message.author.id) {
        const logTime = deleteLog.createdTimestamp;
        const now = Date.now();

        if (now - logTime < 5000) {
          executor = deleteLog.executor;

          if (executor.id === message.client.user.id) {
            deleteType = "bot";
          } else {
            deleteType = "mod";
          }
        }
      }
    } catch (auditError) {
      console.error(
        "Failed to fetch audit log for delete:",
        auditError.message
      );
    }

    const oldData = extractMessageData(message);
    const embed = await buildDeleteEmbed(
      message,
      oldData,
      deleteType,
      executor
    );

    const files = [];
    for (const attachment of message.attachments.values()) {
      if (attachment.contentType?.startsWith("image/")) {
        const buffer = await fetchImageBuffer(attachment.url);
        if (buffer) {
          files.push(new AttachmentBuilder(buffer, { name: attachment.name }));
        }
      }
    }

    await logChannel.send({ embeds: [embed], files });
  } catch (error) {
    console.error("Failed to send delete log:", error);
  }
}

async function logBulkDelete(interaction, deletedMessages, targetUser, reason) {
  const logChannel = getLogChannel(interaction.guild, "message");
  if (!logChannel) return;

  const botId = interaction.client.user.id;

  // Mark all these messages as bulk-deleted with bot executor info
  for (const id of deletedMessages.keys()) {
    recentlyBulkDeleted.set(id, {
      executorId: botId,
      timestamp: Date.now(),
    });
  }

  // Clear from map after 10 seconds
  setTimeout(() => {
    for (const id of deletedMessages.keys()) {
      recentlyBulkDeleted.delete(id);
    }
  }, 10000);

  try {
    const fullLogLines = [];

    for (const [id, msg] of deletedMessages) {
      const timestamp = new Date(msg.createdTimestamp).toISOString();
      const content = msg.content || "[No text content]";
      const attachments =
        msg.attachments.size > 0
          ? [...msg.attachments.values()].map((a) => a.url).join(", ")
          : "None";

      fullLogLines.push(`[${timestamp}] ${msg.author.tag} (${msg.author.id}):`);
      fullLogLines.push(`Content: ${content}`);
      fullLogLines.push(`Attachments: ${attachments}`);
      fullLogLines.push(`Message ID: ${id}`);
      fullLogLines.push("---");
    }

    const fullLogContent = fullLogLines.join("\n");

    // Collect images (up to Discord limit of 10)
    const imageFiles = [];
    for (const message of deletedMessages.values()) {
      for (const attachment of message.attachments.values()) {
        if (
          attachment.contentType?.startsWith("image/") &&
          imageFiles.length < 10
        ) {
          const buffer = await fetchImageBuffer(attachment.url);
          if (buffer) {
            imageFiles.push(
              new AttachmentBuilder(buffer, { name: attachment.name })
            );
          }
        }
      }
    }

    const { embed, files } = buildBulkDeleteEmbed(
      interaction,
      deletedMessages,
      targetUser,
      reason,
      fullLogContent
    );

    const allFiles = [...imageFiles, ...files];

    await logChannel.send({ embeds: [embed], files: allFiles });
  } catch (error) {
    console.error("Failed to log bulk delete:", error);
  }
}

let setupLogger;
try {
  setupLogger = require("./setupLogger.js");
} catch (err) {
  setupLogger = () => console.log("Logger setup skipped");
}

module.exports = {
  logMessageEdit,
  logMessageDelete,
  logBulkDelete,
  logUserUpdate: require("./logUserUpdate.js"),
  logUserJoin: require("./logUserJoinLeave.js").logUserJoin,
  logUserLeave: require("./logUserJoinLeave.js").logUserLeave,
  cacheInvites: require("./logUserJoinLeave.js").cacheInvites,
  logUserUpdateFromUserEvent: require("./logUserUpdateFromUserEvent.js"),
  setupLogger,
};
