const { fetchExtensionData, updateExtensionEntry } = require('../sheetService');
const getServerConfig = require('../../utils/getServerConfig');
const buildEmbed = require('../../components/buildEmbed');
const buildButtons = require('../../components/buildButtons');
const { safeReply } = require('../../utils/safeReply');
const { createExtensionFormModal } = require('../../extension-form/modalBuilder');

async function handleButtonInteraction(interaction) {
  if (!interaction.isButton()) return;
  const customId = interaction.customId;

  const config = getServerConfig(interaction.guildId);
  if (!config) return;

  if (customId === 'start_form') {
    const modal = createExtensionFormModal();
    return interaction.showModal(modal);
  }

  if (customId.startsWith('update:')) {
    const uniqueId = customId.split(':')[1];
    const data = (await fetchExtensionData(interaction.guildId))
      .find(entry => entry.uniqueId.toString() === uniqueId);
    if (!data) return safeReply(interaction, 'Entry not found.', true);

    const updatedEmbed = buildEmbed(data, data.status, `ID: ${uniqueId} | ExtensionHook`);
    const buttons = buildButtons(uniqueId, data.status, true);

    await interaction.message.edit({ embeds: [updatedEmbed], components: buttons });
    return safeReply(interaction, 'Embed updated.', true);
  }

  if (customId.startsWith('status_')) {
    const [, newStatus, uniqueId] = customId.split('_');
    await updateExtensionEntry(interaction.guildId, { uniqueId, status: newStatus });

    const entry = (await fetchExtensionData(interaction.guildId))
      .find(e => e.uniqueId.toString() === uniqueId);
    const embed = buildEmbed(entry, newStatus, `ID: ${uniqueId} | ExtensionHook`);
    const buttons = buildButtons(uniqueId, newStatus);

    await interaction.message.edit({ embeds: [embed], components: buttons });
    return safeReply(interaction, `Status updated to ${newStatus}`, true);
  }

  return safeReply(interaction, 'Unknown interaction.', true);
}

module.exports = handleButtonInteraction;