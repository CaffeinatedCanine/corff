const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages from the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (1-100)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("Only delete messages from this user")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for deletion")
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount") || 1;
    const target = interaction.options.getUser("target");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    await interaction.deferReply({ flags: 64 });

    const channel = interaction.channel;

    if (!channel.isTextBased() || channel.isDMBased()) {
      return interaction.editReply(
        "This command can only be used in text channels."
      );
    }

    try {
      const messages = await channel.messages.fetch({ limit: amount });

      let messagesToDelete = messages;

      if (target) {
        messagesToDelete = messages.filter(
          (msg) => msg.author.id === target.id
        );
      }

      if (messagesToDelete.size === 0) {
        return interaction.editReply("No messages found to delete.");
      }

      const deleted = await channel.bulkDelete(messagesToDelete, true);

      // Only log bulk delete if more than 1 message are deleted
      if (deleted.size > 1) {
        const { logBulkDelete } = require("../../logger/index.js");
        await logBulkDelete(interaction, deleted, target, reason);
      }
      // If single message, let the messageDelete event handle it naturally

      const targetInfo = target ? ` from ${target.tag}` : "";
      await interaction.editReply(
        `✅ Deleted ${deleted.size} message(s)${targetInfo}. Reason: ${reason}`
      );
    } catch (error) {
      console.error("Clear command error:", error);

      if (error.code === 50034) {
        await interaction.editReply(
          "❌ Cannot delete messages older than 14 days."
        );
      } else {
        await interaction.editReply(
          "❌ Failed to delete messages. Check bot permissions."
        );
      }
    }
  },
};
