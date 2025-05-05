const { EmbedBuilder } = require('discord.js');
const statusMap = require('../constants/statusMap');
const formatDate = require('../utils/formatDate');

function buildEmbed(entry, statusKey, footerText) {
  const normalizedStatusKey = (statusKey || entry.status || '')
    .toLowerCase()
    .replace(/\s+/g, '');

  const statusData = statusMap[normalizedStatusKey] || {
    title: `Extension Request - ID: ${entry.uniqueId}`,
    color: '#999999',
    description: 'Details below:',
  };

  const fields = [];

  fields.push(
    {
      name: 'Extension To',
      value: entry.extensionDate ? formatDate(entry.extensionDate) : 'N/A',
      inline: true,
    },
    {
      name: 'Contact Through',
      value: entry.fromWhere || 'N/A',
      inline: true,
    },
    {
      name: '',
      value: '',
    },
    {
      name: 'AO3 Handle',
      value: entry.ao3,
      inline: true,
    }
  );

  if (entry.discord) {
    fields.push({
      name: 'Discord',
      value: entry.discord,
      inline: true,
    });
  }
  
  fields.push (
    {
      name: '',
      value: '',
    },
    {
      name: 'Email',
      value: entry.email,
      inline: false,
    }
  );

  if (entry.note) {
    fields.push({
      name: 'Note',
      value: entry.note,
    });
  }

  fields.push

  const embed = new EmbedBuilder()
    .setTitle(statusData.title)
    .setColor(statusData.color)
    .setDescription(statusData.description)
    .addFields(fields)
    .setFooter({
      text: footerText || `ID: ${entry.uniqueId} | Submitted through ${entry.fromWhere} | ExtensionHook`,
    });

  return embed;
}

module.exports = buildEmbed;