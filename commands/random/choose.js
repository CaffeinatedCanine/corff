const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Give a comma separated list of options, receive a choice.")
    .addStringOption((option) =>
      option
        .setName("options")
        .setDescription("Separate your options with a comma.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const options = interaction.options.getString("options").split(", ");
    const choice = Math.floor(Math.random() * options.length).toString();

    interaction.reply(`${options[choice]}`);
  },
};
