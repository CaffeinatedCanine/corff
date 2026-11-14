const { SlashCommandBuilder, parseEmoji, MessageFlags } = require("discord.js");

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Manages emoji.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Provide the name for the emoji.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Provide the emoji or url for the emoji.")
        .setRequired(true),
    ),
  async execute(interaction) {
    const emojiId = parseEmoji(interaction.options.getString("url")).id;
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;

    await interaction.guild.emojis
      .create({
        attachment: emojiUrl,
        name: interaction.options.getString("name"),
      })
      .then((emoji) =>
        interaction.reply({
          content: `Created new emoji with name ${emoji.name}!`,
          flags: MessageFlags.Ephemeral,
        }),
      )
      .catch(console.error);
  },
};
