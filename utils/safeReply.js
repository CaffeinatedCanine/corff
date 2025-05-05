async function safeReply(interaction, content, ephemeral = false) {
  try {
    const replyOptions = { content };
    if (ephemeral) replyOptions.flags = 64;

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(replyOptions);
    } else {
      await interaction.followUp(replyOptions);
    }
  } catch (error) {
    console.warn(`safeReply failed for ${interaction.commandName || 'unknown command'}: ${error.message}`);
  }
}

module.exports = { safeReply };

