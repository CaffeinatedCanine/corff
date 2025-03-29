const { SlashCommandBuilder } = require('@discordjs/builders');
const { WebhookClient } = require('discord.js');
const characters = require('../../characters');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rp')
        .setDescription('Talk as a character')
        .addStringOption(option =>
            option.setName('character')
                .setDescription('The character to talk as')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true)),
    async execute(interaction) {
        const character = interaction.options.getString('character');
        const message = interaction.options.getString('message');

        if (characters[character]) {
            const charInfo = characters[character];

            const webhooks = await interaction.channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.name === 'CharacterWebhook');

            if (!webhook) {
                // Provide both 'name' and 'avatar' when creating the webhook
                webhook = await interaction.channel.createWebhook({
                    name: 'CharacterWebhook',
                    avatar: charInfo.avatar_url,
                });
            }

            const webhookClient = new WebhookClient({ url: webhook.url });

            await webhookClient.send({
                content: message,
                username: charInfo.name,
                avatarURL: charInfo.avatar_url,
            });

           // await interaction.reply({ content: 'Message sent!', flags: 64 });
        } else {
            await interaction.reply({ content: 'Character not found. Please choose a valid character.', flags: 64 });
        }
    },
};