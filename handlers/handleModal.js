// handlers/handleModal.js
const getServerConfig = require('../utils/getServerConfig');
const { safeReply } = require('../utils/safeReply');
const { logInfo, logError } = require('../utils/logger');
const { handleFormSubmission } = require('../extension-form/handleFormSubmission');
const { handleEditSubmission } = require('../extension-form/handleEditSubmission');

module.exports = async function handleModal(client, interaction) {
  const guildId = interaction.guildId;
  const config  = getServerConfig(guildId);
  if (!config) {
    return safeReply(interaction, '❌ This server is not configured.', true);
  }

  try {
    logInfo(`Modal submitted "${interaction.customId}" in guild ${guildId}`);

    if (interaction.customId === 'extensionForm') {
      // pass config so form handler can post to the correct apiUrl
      return handleFormSubmission(interaction, config);
    }

    if (interaction.customId === 'edit_form') {
      return handleEditSubmission(interaction, config);
    }

    logError(`Unknown modal interaction: ${interaction.customId}`);
    await safeReply(interaction, 'Unknown modal interaction. Please contact the mod team.', true);

  } catch (err) {
    logError(`Error handling modal: ${err.message}`);
    await safeReply(interaction, '⚠️ An error occurred while processing the form.', true);
  }
};