const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('postform')
        .setDescription('Post the static extension request form'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Extension Request Form')
            .setDescription('Please click the button below to submit your extension request.')
            .setColor('#0099FF');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_form')
                    .setLabel('Submit Extension Request')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
        });
    },
};
