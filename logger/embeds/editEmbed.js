const { EmbedBuilder } = require("discord.js");

function buildEditEmbed(oldData, newMessage) {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: oldData.author?.username || "Unknown",
      iconURL: oldData.author?.avatar || null,
    })
    .setTitle(`Message Edited in <#${oldData.channelId}>`)
    .setColor("Orange")
    .setDescription(
      `[Jump to Message](https://discord.com/channels/${oldData.guildId}/${oldData.channelId}/${oldData.messageId})`
    )
    .setFooter({ text: `User ID: ${oldData.author?.id}` })
    .setTimestamp();

  // Build Before field with content and/or image links
  let beforeValue = oldData.content || "No content";

  // Add image links if images were present
  if (oldData.images?.length > 0) {
    const imageLinks = oldData.images
      .map((url) => `[Image](${url})`)
      .join(", ");
    beforeValue =
      beforeValue === "No content"
        ? imageLinks
        : `${beforeValue}\n${imageLinks}`;
  }

  // Build After field
  let afterValue = newMessage.content || "No content";

  // Check if new message still has attachments
  if (newMessage.attachments?.size > 0) {
    const newImageLinks = [...newMessage.attachments.values()]
      .map((att) => `[Image](${att.url})`)
      .join(", ");
    afterValue =
      afterValue === "No content"
        ? newImageLinks
        : `${afterValue}\n${newImageLinks}`;
  }

  embed.addFields(
    { name: "Before", value: beforeValue.substring(0, 1024), inline: false },
    { name: "After", value: afterValue.substring(0, 1024), inline: false },
    {
      name: "Author",
      value: oldData.author
        ? `[${oldData.author.username}](https://discord.com/users/${oldData.author.id})`
        : "Unknown",
    }
  );

  return embed;
}

module.exports = buildEditEmbed;
