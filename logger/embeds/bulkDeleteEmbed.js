const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

function buildBulkDeleteEmbed(
  interaction,
  deletedMessages,
  targetUser,
  reason,
  fullLogContent
) {
  const deleter = interaction.user;
  const channel = interaction.channel;

  const authorCounts = new Map();
  for (const msg of deletedMessages.values()) {
    const count = authorCounts.get(msg.author.tag) || 0;
    authorCounts.set(msg.author.tag, count + 1);
  }

  const authorSummary = [...authorCounts.entries()]
    .map(([tag, count]) => `${tag}: ${count}`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor("DarkPurple")
    .setTitle("Bulk Message Delete")
    .setAuthor({
      name: deleter.tag,
      iconURL: deleter.displayAvatarURL(),
    })
    .setDescription(
      `**${deletedMessages.size}** messages deleted in ${channel}`
    )
    .addFields(
      {
        name: "Deleted by",
        value: `${deleter} (${deleter.id})`,
        inline: true,
      },
      {
        name: "Channel",
        value: `<#${channel.id}>`,
        inline: true,
      },
      {
        name: "Reason",
        value: reason,
        inline: true,
      }
    )
    .setFooter({ text: `User ID: ${deleter.id}` })
    .setTimestamp();

  if (targetUser) {
    embed.addFields({
      name: "Filter",
      value: `Only messages from ${targetUser.tag} (${targetUser.id})`,
      inline: false,
    });
  }

  embed.addFields({
    name: "Message Breakdown",
    value: authorSummary.substring(0, 1024) || "No data",
  });

  const files = [];

  if (fullLogContent) {
    const logBuffer = Buffer.from(fullLogContent, "utf-8");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    files.push(
      new AttachmentBuilder(logBuffer, {
        name: `deleted-messages-${timestamp}.txt`,
      })
    );

    embed.addFields({
      name: "Full Log",
      value: "See attached file for complete message content",
    });
  }

  return { embed, files };
}

module.exports = buildBulkDeleteEmbed;
