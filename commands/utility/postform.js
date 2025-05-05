const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

const getServerConfig = require('../../utils/getServerConfig');
const { logError } = require('../../utils/logger');
const { safeReply } = require('../../utils/safeReply');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postform')
    .setDescription('Post the static extension request form')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const config = getServerConfig(interaction.guildId);
    if (!config) {
      return safeReply(interaction, '❌ Missing server configuration. Please alert Fox or Enig.', true);
    }

    try {
      const channel = interaction.channel;

      const webhook = await channel.createWebhook({
        name: config.botName,
        avatar: config.botAvatar
      });

      const embed = new EmbedBuilder()
        .setDescription(config.postFormDescription);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('start_form')
          .setLabel('Submit Extension Request')
          .setStyle(ButtonStyle.Primary)
      );

      await webhook.send({
        embeds: [embed],
        components: [row],
      });

      await safeReply(interaction, '✅ Extension form posted.', true);

      await webhook.delete();


    } catch (err) {
      logError('Error posting extension form:', err);
      await safeReply(interaction,'❌ Failed to post the form. See console.', true);
    }
  }
};
