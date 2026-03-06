const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { loadLogConfig, saveLogConfig } = require("../../logger/logConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setlog")
    .setDescription("Set a log channel for a specific log type")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Which log type to configure")
        .setRequired(true)
        .addChoices(
          { name: "Message Logs", value: "message" },
          { name: "User Updates", value: "userUpdate" },
          { name: "Join/Leave", value: "joinLeave" },
          { name: "Role Changes", value: "roles" },
          { name: "Boosting", value: "boost" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to send logs to")
        .setRequired(true)
    ),

  async execute(interaction) {
    const type = interaction.options.getString("type");
    const channel = interaction.options.getChannel("channel");

    const config = loadLogConfig();
    config[type] = channel.id;
    saveLogConfig(config);

    await interaction.reply({
      content: `Log channel for **${type}** set to ${channel}`,
      flags: 64,
    });
  },
};
