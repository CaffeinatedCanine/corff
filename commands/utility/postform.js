require('dotenv').config();
const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postform')
    .setDescription('Post the static extension request form'),

  async execute(interaction) {
    const channel = interaction.channel;

    try {
      // Creates the Extension Form through webhook
      const webhook = await channel.createWebhook({
        name: 'Extension Request Form',
        avatar: 'https://static.wikia.nocookie.net/dragonage/images/3/31/Dav_solas_hair.png'
      });

      // Builds the embed
      const embed = new EmbedBuilder()
        .setDescription(
            `If you need an extension for your Arlathan eXchange Assignment, please click the button below and complete the form that appears, or access the form directly on our website at [this address](https://arlathanxchange.neocities.org/extensionrequest/). Make sure to submit your request before the initial due date of the exchange.

            **__Please note:__** All assignments are due by **<t:1748206800:t>** on the __assigned extension date__. If an assignment misses the initial due date or the extension deadline, and we have not received any communication from the participant, the mods may assign it to a pinch hitter.

            We will only use the method of communication you provide below to contact you about this request and follow-up if necessary. Your email or Discord handle will not be used for any other purpose and will be deleted from our records once the exchange is completed.

            **__Important:__** Your extension is not official until you receive confirmation from us!`
        )
        .setColor('#0099FF');

      // Builds the button row
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('start_form')
          .setLabel('Submit Extension Request')
          .setStyle(ButtonStyle.Primary)
      );

      // Sends the webhook to the channel
      await webhook.send({
        embeds: [embed],
        components: [row],
      });

      // Deletes the webhook so it doesn’t linger in your channel’s settings
      await webhook.delete();

      // Sends an ephemeral message in case of an error
    } catch (err) {
      console.error('Error posting extension form:', err);
      await interaction.reply({ content: '❌ Failed to post the form. See console.', flags: 64 });
    }
  }
};