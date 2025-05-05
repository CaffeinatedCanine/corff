// handlers/handleButton.js
const getServerConfig = require('../utils/getServerConfig');
const { safeReply } = require('../utils/safeReply');
const { logInfo, logError } = require('../utils/logger');
const { handleButtonInteraction } = require('../services/interactionService');

module.exports = async function handleButton(client, interaction) {
  const guildId = interaction.guildId;
  const config  = getServerConfig(guildId);
  if (!config) {
    return safeReply(interaction, '❌ This server is not configured.', true);
  }

  try {
    logInfo(`Button "${interaction.customId}" clicked in guild ${guildId}`);

    if (interaction.customId.startsWith('update:') ||
        interaction.customId.startsWith('status_')) {
      await interaction.deferReply({ flags: 64 });
    }

    await handleButtonInteraction(interaction, config);

  } catch (err) {
    logError(`Error handling button interaction: ${err.message}`);
    await safeReply(interaction, '⚠️ Error handling button.', true);
  }
};