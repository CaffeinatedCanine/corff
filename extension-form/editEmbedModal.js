const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const axios = require('axios');

async function createEditEmbedModal(uniqueId) {
    try {
        // Fetch data from the API using the uniqueId
        const apiURL = process.env.API_URL;
        const response = await axios.get(apiURL);
        const entryArray = response.data;

        console.log(`Fetched Data for uniqueId (${uniqueId}):`, entryArray);

        // Find the correct entry in the array
        const entry = entryArray.find(row => row.uniqueId.toString() === uniqueId);
        if (!entry) throw new Error(`No data found for uniqueId: ${uniqueId}`);

        // Extract editable fields
        const discord = entry.discord || '';
        const ao3 = entry.ao3 || '';
        const email = entry.email || '';
        const extensionDate = entry.extensionDate && !isNaN(Date.parse(entry.extensionDate))
            ? new Date(entry.extensionDate).toISOString().split('T')[0] // Convert to YYYY-MM-DD format
            : ''; // Default to empty string if invalid
        const note = entry.note || '';

        // Log extracted values for debugging
        console.log('Parsed Data:', { discord, ao3, email, extensionDate, note });

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('edit_form')
            .setTitle(`Edit Extension Request - ID: ${uniqueId}`);

        // Add editable fields
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
        console.error('Error creating Edit modal:', error.message);
        throw error;
    }
}

module.exports = { createEditEmbedModal };