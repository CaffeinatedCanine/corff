const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Function to get tomorrow's date in YYYY-MM-DD format
function getTomorrowDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Function to create the modal
function createExtensionFormModal() {
    const modal = new ModalBuilder()
        .setCustomId('extensionForm')
        .setTitle('Extension Request Form');

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('ao3Handle')
                .setLabel('Your AO3 Handle')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('email')
                .setLabel('Your Email')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('extensionDate')
                .setLabel('Extension Date (YYYY-MM-DD)')
                .setPlaceholder(getTomorrowDate()) // Tomorrow's date dynamically as a placeholder
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('preference') 
                .setLabel('Contact Preference (Email or Discord)')
                .setPlaceholder('Email | Discord')
                .setStyle(TextInputStyle.Short) // Users input "Email" or "Discord"
                .setRequired(true)
        )
    );

    return modal;
}

module.exports = { createExtensionFormModal };
