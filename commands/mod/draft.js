const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {
  buildCreateModal,
  DRAFT_KIND,
} = require("../../automation/drafts/utils/ui");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("draft")
    .setDescription("Create a draft post or embed for later posting")
    .addSubcommand((subcommand) =>
      subcommand.setName("embed").setDescription("Create a draft embed"),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("post").setDescription("Create a draft text post"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const kind = subcommand === "embed" ? DRAFT_KIND.embed : DRAFT_KIND.post;

    await interaction.showModal(buildCreateModal(kind));
  },
};
