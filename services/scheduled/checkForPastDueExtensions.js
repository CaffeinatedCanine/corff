const { fetchExtensionData, updateExtensionEntry } = require('../sheetService');
const getServerConfig = require('../../utils/getServerConfig');
const buildEmbed = require('../../components/buildEmbed');
const buildButtons = require('../../components/buildButtons');
const { ChannelType } = require('discord.js');

async function checkForPastDueExtensions(client) {
  const guilds = client.guilds.cache;

  for (const [guildId, guild] of guilds) {
    const config = getServerConfig(guildId);
    if (!config) continue;

    const { channelId, modRoleId } = config;
    const data = await fetchExtensionData(guildId);
    const channel = client.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) continue;

    const now = new Date();
    const messages = await channel.messages.fetch({ limit: 100 });

    for (const [, message] of messages) {
      const footer = message.embeds?.[0]?.footer?.text;
      if (!footer) continue;

      const match = footer.match(/ID:\s*(\d+)/);
      const uniqueId = match?.[1];
      if (!uniqueId) continue;

      const entry = data.find(e => e.uniqueId.toString() === uniqueId);
      if (!entry || !entry.extensionDate) continue;

      const extDate = new Date(entry.extensionDate);
      if (extDate >= now) continue;

      const currentStatus = entry.status?.toLowerCase().replace(/\s+/g, '');
      if (['pastdue', 'fulfilled', 'rejected'].includes(currentStatus)) continue;

      const footerText = `ID: ${uniqueId} | Submitted through ${entry.fromWhere || 'unknown'} | ExtensionHook`;
      const updatedEmbed = buildEmbed(entry, 'pastdue', footerText);
      const buttons = buildButtons(uniqueId, 'pastdue');

      await message.edit({ embeds: [updatedEmbed], components: buttons });

      await message.channel.send({
        content: `<@&${modRoleId}> Extension request **${uniqueId}** is now past due.`,
        reply: { messageReference: message.id }
      });

      await updateExtensionEntry(guildId, { uniqueId, status: 'Past Due' });
    }
  }
}

module.exports = checkForPastDueExtensions;