const { fetchExtensionData } = require('../sheetService');
const getServerConfig = require('../../utils/getServerConfig');
const buildEmbed = require('../../components/buildEmbed');
const buildButtons = require('../../components/buildButtons');

async function handleNewMessage(message) {
  if (
    !message.author.bot ||
    message.author.id === message.client.user.id ||
    !message.embeds.length ||
    !message.embeds[0].footer?.text?.includes('ExtensionHook')
  ) return;

  const config = getServerConfig(message.guildId);
  if (!config) return;

  const embed = message.embeds[0];
  const footer = embed.footer?.text || '';
  const match = footer.match(/ID:\s*(\d+)/);
  if (!match) return;

  const uniqueId = match[1];
  const allEntries = await fetchExtensionData(message.guildId);
  const entry = allEntries.find(e => e.uniqueId.toString() === uniqueId);
  if (!entry) return;

  const newEmbed = buildEmbed(entry, entry.status, footer);
  const buttons = buildButtons(uniqueId, entry.status);

  try {
    await message.delete();
    await message.channel.send({
      content: `Go to the [Extension gSheet](${config.apiUrl}) to make changes.`,
      embeds: [newEmbed],
      components: buttons
    });
    console.log(`✅ Replaced webhook message for ID ${uniqueId}`);
  } catch (err) {
    console.error(`❌ Failed to replace webhook message for ID ${uniqueId}:`, err);
  }
}

module.exports = handleNewMessage;