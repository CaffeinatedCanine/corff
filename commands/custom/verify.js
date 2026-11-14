const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Remind a member to verify.")
    .addMentionableOption((option) =>
      option
        .setName("member")
        .setDescription("Mention the member.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const member = interaction.options.getMentionable("member");
    interaction.reply(
      `${member} please be sure to submit your verification request by using the form above!`
    );
  },
};
