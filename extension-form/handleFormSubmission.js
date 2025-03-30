require('dotenv').config();
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

async function handleFormSubmission(interaction) {
    try {
        const discordName = interaction.user.username;
        const ao3Handle = interaction.fields.getTextInputValue('ao3Handle');
        const email = interaction.fields.getTextInputValue('email');
        const extensionDate = interaction.fields.getTextInputValue('extensionDate');
        const preference = interaction.fields.getTextInputValue('preference');

        console.log('Form data:', { discordName, ao3Handle, email, extensionDate, preference });

        await interaction.reply({ content: 'Form data received. Processing...', flags: 64 });

        // Prepare data for Google Sheets API request
        const data = {
            fromWhere: 'discord',
            discord: discordName,
            ao3: ao3Handle,
            email: email,
            extensionDate: extensionDate,
            preference: preference,
            status: 'Not Contacted',
        };

        const apiURL = process.env.API_URL;

        // Use axios to make the request
        const response = await axios.post(apiURL, data);
        const result = response.data;

        if (response.status === 200) {
            // Create an embedded message to confirm submission
            const embed = new EmbedBuilder()
                .setTitle('Extension Request Submitted')
                .addFields(
                    { name: 'Discord', value: discordName, inline: true },
                    { name: 'AO3 Handle', value: ao3Handle, inline: true },
                    { name: 'Email', value: email, inline: true },
                    { name: 'Extension To', value: extensionDate, inline: true },
                    { name: 'Preference', value: preference, inline: true }
                )
                .setColor('#00FF00');

            // Reply to the interaction with the embedded message
            await interaction.editReply({ embeds: [embed], content: 'Request submitted successfully!', flags: 64 });
        } else {
            console.error('Error submitting form:', result);
            await interaction.editReply({ content: 'There was an error submitting your request. Please try again later.', flags: 64 });
        }
    } catch (error) {
        console.error('Error handling form submission:', error);
        try {
            await interaction.editReply({ content: 'There was an error processing your request. Please try again later.', flags: 64 });
        } catch (editError) {
            console.error('Error editing reply:', editError);
        }
    }
}

module.exports = { handleFormSubmission };