const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Toss a coin."),

  async execute(interaction) {
    const coin = ["Heads", "Tails"];
    const coinFlip = Math.floor(Math.random() * coin.length).toString();

    interaction.reply(`${coin[coinFlip]}`);
  },
};
