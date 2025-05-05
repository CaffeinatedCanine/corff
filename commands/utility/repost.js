const { SlashCommandBuilder } = require('discord.js');
const { PermissionFlagsBits } = require("discord-api-types/v10");
const { fetchExtensionData } = require('../../services/sheetService');
const buildEmbed = require('../../components/buildEmbed');
const buildButtons = require('../../components/buildButtons');
const getServerConfig = require('../../utils/getServerConfig');
const { safeReply } = require('../../utils/safeReply'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repost')
    .setDescription('Repost an extension embed.')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('The unique ID of the extension request.')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
    
  async execute(interaction) {
    const config = getServerConfig(interaction.guildId);
    if (!config) {
      return safeReply(interaction, '❌ Missing server configuration. Please alert Fox or Enig.', true);
    }

    const uniqueId = interaction.options.getString('id');
    await interaction.deferReply({ flags: 64 });

    const entries = await fetchExtensionData(interaction.guildId);
    const entry = entries.find(e => e.uniqueId.toString() === uniqueId);

    if (!entry) {
      return interaction.editReply(`❌ No request found for ID: ${uniqueId}`);
    }

    const embed = buildEmbed(
      entry,
      entry.status,
      `ID: ${uniqueId} | Submitted through ${entry.fromWhere} | ExtensionHook`
    );
    const components = buildButtons(uniqueId, entry.status);

    await interaction.channel.send({
      content: `Go to the [Extension gSheet](${config.sheetUrl}) to make changes.`,
      embeds: [embed],
      components
    });

    await interaction.editReply('✅ Embed reposted.');
  }
};