require('dotenv').config();
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

async function handleEditSubmission(interaction) {
    if (interaction.customId !== 'edit_form') return;

    await interaction.deferReply({ flags: 64 }); // Immediately defer to avoid timeout

    try {
        // Extract uniqueId from the embed footer
        const footerText = interaction.message.embeds[0]?.footer?.text;
        if (!footerText) throw new Error('Footer text is missing from the embed.');
        const uniqueIdMatch = footerText.match(/ID:\s*(\d+)/);
        if (!uniqueIdMatch) throw new Error('Unique ID not found in embed footer.');
        const uniqueId = uniqueIdMatch[1];

        // Fetch original data (to preserve fields not updated in modal)
        const apiURL = process.env.API_URL;
        const response = await axios.get(apiURL);
        const entryArray = response.data;
        const entry = entryArray.find(row => row.uniqueId.toString() === uniqueId);
        if (!entry) throw new Error(`No data found for uniqueId: ${uniqueId}`);
        console.log('Fetched Data:', entry);

        // Extract updated data from modal (editable fields only)
        const discord = interaction.fields.getTextInputValue('discord') || entry.discord || '';
        const ao3 = interaction.fields.getTextInputValue('ao3') || entry.ao3 || 'Not provided';
        const email = interaction.fields.getTextInputValue('email') || entry.email || 'Not provided';
        const extensionDate = interaction.fields.getTextInputValue('extensionDate') || entry.extensionDate || 'Not provided';
        const note = interaction.fields.getTextInputValue('note') || entry.note || '';

        // Preserve original Status and Preference values from fetched entry
        const status = entry.status || 'Not Contacted';
        const preference = entry.preference || 'Discord';

        // Construct payload for Google Sheet update
        const data = {
            uniqueId,
            discord,
            ao3,
            email,
            extensionDate,
            note,
            status, // Include original status
            preference, // Include original preference
        };

        console.log('Sending data to Google Sheets API:', JSON.stringify(data, null, 2));
        const updateResponse = await axios.post(apiURL, data);
        console.log('Google Sheet API Response:', updateResponse.data);

        if (updateResponse.status !== 200) {
            throw new Error(`Google Sheet API error: ${updateResponse.data.message}`);
        }

        // Construct updated fields for the embed
        const embedFields = [
            { name: 'Extension To', value: extensionDate, inline: true },
            { name: 'Status', value: status, inline: true },
            { name: 'Contact Through', value: preference, inline: true },
            { name: 'AO3 Handle', value: ao3, inline: true },
        ];

        if (discord) {
            embedFields.push({ name: 'Discord', value: discord, inline: true });
        }

        embedFields.push({ name: 'Email', value: email, inline: false }); // Always include email
        
        if (note) {
            embedFields.push({ name: 'Note', value: note, inline: false });
        }

        // Update the embed
        const updatedEmbed = new EmbedBuilder()
            .setTitle(interaction.message.embeds[0]?.title || 'Updated Extension Request')
            .setColor(interaction.message.embeds[0]?.color || '#00FF00')
            .setDescription(interaction.message.embeds[0]?.description || 'Updated information has been provided.')
            .setFields(embedFields)
            .setFooter({ text: footerText });

        await interaction.message.edit({ embeds: [updatedEmbed] });
        await interaction.followUp({ content: 'Embed successfully updated!', flags: 64 });
    } catch (error) {
        console.error('Error handling modal submission:', error.message);
        await interaction.followUp({
            content: 'There was an error updating the embed. Please try again later.',
            flags: 64,
        });
    }
}

module.exports = { handleEditSubmission };