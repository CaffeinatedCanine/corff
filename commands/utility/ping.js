const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction) {
    const botName = interaction.client.user.username;
    await interaction.reply(`Ping! My name is ${botName}`);
  },
};
