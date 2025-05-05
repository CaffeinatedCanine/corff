const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildButtons(uniqueId, currentStatus, isUpdated = false) {
  const disableAll = !isUpdated && (['Fulfilled', 'Rejected'].includes(currentStatus));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId(`status_Approved_${uniqueId}`)
        .setLabel('Approved')
        .setStyle(ButtonStyle.Primary).
        setDisabled(currentStatus === 'Approved' || disableAll),
    new ButtonBuilder()
        .setCustomId(`status_Fulfilled_${uniqueId}`)
        .setLabel('Fulfilled')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disableAll),
    new ButtonBuilder()
        .setCustomId(`status_Rejected_${uniqueId}`)
        .setLabel('Rejected')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disableAll),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId(`status_WaitingForUpdate_${uniqueId}`)
        .setLabel('Waiting for Update')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disableAll),
    new ButtonBuilder()
        .setCustomId(`update:${uniqueId}`)
        .setLabel('Update')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(false)
  );

  return [row1, row2];
}

module.exports = buildButtons;