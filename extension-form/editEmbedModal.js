const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const axios = require('axios');
const getServerConfig = require('../utils/getServerConfig');
const { logInfo, logError } = require('../utils/logger');
const formatDate = require('../utils/formatDate');

async function createEditEmbedModal(uniqueId, guildId) {
    try {
        const config = getServerConfig(guildId);
        if (!config || !config.apiUrl) throw new Error(`Missing config or apiUrl for guild ID: ${guildId}`);

        const response = await axios.get(config.apiUrl);
        const entryArray = response.data;

        logInfo(`Fetched Data for uniqueId (${uniqueId}): ${JSON.stringify(entryArray)}`);

        const entry = entryArray.find(row => row.uniqueId.toString() === uniqueId);
        if (!entry) throw new Error(`No data found for uniqueId: ${uniqueId}`);

        const discord = entry.discord || '';
        const ao3 = entry.ao3 || '';
        const email = entry.email || '';
        const extensionDate = formatDate(entry.extensionDate);
        const note = entry.note || '';

        logInfo(`Parsed Data: ${JSON.stringify({ discord, ao3, email, extensionDate, note })}`);

        const modal = new ModalBuilder()
            .setCustomId('edit_form')
            .setTitle(`Edit Extension Request - ID: ${uniqueId}`);

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('discord')
                    .setLabel('Discord Username')
                    .setStyle(TextInputStyle.Short)
                    .setValue(discord)
                    .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('ao3')
                    .setLabel('AO3 Handle')
                    .setStyle(TextInputStyle.Short)
                    .setValue(ao3)
                    .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('email')
                    .setLabel('Email')
                    .setStyle(TextInputStyle.Short)
                    .setValue(email)
                    .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('extensionDate')
                    .setLabel('Extension Date (YYYY-MM-DD)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(extensionDate)
                    .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('note')
                    .setLabel('Note')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(note)
                    .setRequired(false)
            )
        );

        return modal;
    } catch (error) {
        logError(`Error creating Edit modal: ${error.message}`);
    }
}

module.exports = { createEditEmbedModal };