const { EmbedBuilder } = require("discord.js");

async function buildDeleteEmbed(message, oldData, deleteType, executor) {
  const authorName = oldData.author?.username || "Unknown";
  const authorAvatar = oldData.author?.avatar || null;
  const authorId = oldData.author?.id || "Unknown";
  const authorProfile = oldData.author
    ? `https://discord.com/users/${authorId}`
    : null;

  const createdTimestamp = oldData.createdTimestamp
    ? new Date(oldData.createdTimestamp).toLocaleString()
    : "Unknown";

  // Color based on delete type
  const colors = {
    self: "Red", // Self-delete
    mod: "DarkRed", // Moderator deleted
    bot: "Purple", // Bot command deleted
  };

  const titles = {
    self: "Message Deleted (Self)",
    mod: "Message Deleted by Moderator",
    bot: "Message Deleted by Bot",
  };

  const embed = new EmbedBuilder()
    .setAuthor({ name: authorName, iconURL: authorAvatar })
    .setTitle(titles[deleteType] || titles.self)
    .setColor(colors[deleteType] || colors.self)
    .setDescription(`Message ID: ${oldData.messageId || message.id}`)
    .addFields(
      {
        name: "Content",
        value: oldData.content || "No content",
        inline: false,
      },
      {
        name: "Author",
        value: oldData.author ? `[${authorName}](${authorProfile})` : "Unknown",
        inline: false,
      },
      { name: "Created At", value: createdTimestamp, inline: false }
    )
    .setFooter({ text: `User ID: ${authorId}` })
    .setTimestamp();

  // Add images
  if (oldData.images?.length > 0) {
    oldData.images.forEach((url, index) => {
      embed.addFields({ name: `Image ${index + 1}`, value: `[Image](${url})` });
    });
    embed.setImage(oldData.images[0]);
  }

  // Add embed-data if present
  if (oldData.embeds?.length > 0) {
    oldData.embeds.forEach((e, index) => {
      const embedContent = `
            **Title:** ${e.title || "No title"}
            **Description:** ${e.description || "No description"}
            **Fields:** ${e.fields?.length > 0 ? e.fields.map((f) => `${f.name}: ${f.value}`).join("\n") : "No fields"}
            **Footer:** ${e.footer || "No footer"}
            **URL:** ${e.url || "No URL"}
            **Color:** ${e.color || "No color"}
            **Image:** ${e.image || "No image"}
            **Thumbnail:** ${e.thumbnail || "No thumbnail"}
            `;

      embed.addFields({
        name: `Embed ${index + 1}`,
        value: embedContent,
      });
    });
  }

  // Add deletion info based on type
  if (deleteType === "self") {
    embed.addFields({
      name: "Deleted by",
      value: "User (self-delete)",
    });
  } else if (deleteType === "bot") {
    embed.addFields({
      name: "Deleted by",
      value: "Bot (via command)",
    });
  } else if (deleteType === "mod" && executor) {
    embed.addFields({
      name: "Deleted by",
      value: `Moderator: ${executor.tag} (${executor.id})`,
    });
  }

  return embed;
}

module.exports = buildDeleteEmbed;
