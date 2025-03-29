require('dotenv').config();
const axios = require('axios');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createExtensionFormModal } = require('./extension-form/modalBuilder'); // Ensure this is imported correctly


const apiURL = process.env.API_URL;
const modsRoleId = process.env.MODS_ROLE_ID;
const channelId = process.env.CHANNEL_ID;

async function fetchExtensionData() {    
    try {
        const response = await axios.get(apiURL);
        if (response.headers['content-type'].includes('application/json')) {
            console.log('Fetched extension data:', response.data);
            return response.data;
        } else {
            console.error('Invalid response format:', response.data);
            return [];
        }
    } catch (error) {
        if (error.response) {
            console.error(`Error fetching extension data: ${error.message}`);
            console.error(`Status: ${error.response.status}`);
            console.error(`Response: ${error.response.data}`);
        } else {
            console.error('Error fetching extension data:', error.message);
        }
        return [];
    }
}

async function checkForPastDueExtensions(client) {    

    try {
        const extensionData = await fetchExtensionData();
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            console.error('Channel not found');
            return;
        }

        const messages = await channel.messages.fetch({ limit: 100 });

        messages.forEach(async (message) => {
            if (message.embeds.length > 0 && message.embeds[0].footer && message.embeds[0].footer.text.includes('ExtensionHook')) {
                const embed = message.embeds[0];
                const uniqueId = embed.footer.text.match(/ID: (\d+)/)[1];
                const extensionEntry = extensionData.find(entry => entry.uniqueId.toString() === uniqueId);

                if (extensionEntry) {
                    const extensionDate = new Date(extensionEntry.extensionDate);
                    const now = new Date();

                    if (!isNaN(extensionDate.getTime())) {
                        const formattedExtensionDate = extensionDate.toISOString().split('T')[0];

                        const isPastDue = embed.fields.some(field => field.name === 'Status' && field.value === 'Past Due');

                        if (now > extensionDate && extensionEntry.status !== 'Fulfilled' && !isPastDue) {
                            const newEmbedFields = [
                                { name: 'Extension To', value: formattedExtensionDate, inline: true },
                                { name: 'Status', value: 'Past Due', inline: true },
                                { name: 'Contact through', value: extensionEntry.preference, inline: true },
                                { name: 'AO3 Handle', value: extensionEntry.ao3, inline: true },
                                { name: 'Discord', value: extensionEntry.discord, inline: true },
                                { name: 'Email', value: extensionEntry.email, inline: false }
                            ];

                            const newEmbed = new EmbedBuilder()
                                .setTitle('💀 Extension Request - Past Due 💀')
                                .setColor('#FF0000')
                                .setDescription('This extension request is past due.\nPlease take appropriate action.')
                                .setFields(newEmbedFields)
                                .setFooter({ text: embed.footer.text });

                            if (message.author.id === client.user.id) {
                                await message.edit({ embeds: [newEmbed] });

                                await channel.send({
                                    content: `<@&${modsRoleId}> This extension request (ID: ${uniqueId}) is now past due.`,
                                    reply: { messageReference: message.id }
                                });
                            }

                            const data = { discord: 'system', status: 'Past Due', uniqueId };
                            await axios.post(apiURL, data);
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error checking for past due extensions:', error);
    }
}

// Helper function to create the button row dynamically
function createButtonRow(footerText, action) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`status_Approved_${footerText}`)
            .setLabel('Approved')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(action === 'Approved' || action === 'Fulfilled' || action === 'Rejected'),
        new ButtonBuilder()
            .setCustomId(`status_WaitingForUpdate_${footerText}`)
            .setLabel('Waiting for Update')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(action === 'Fulfilled' || action === 'Rejected'),
        new ButtonBuilder()
            .setCustomId(`status_Fulfilled_${footerText}`)
            .setLabel('Fulfilled')
            .setStyle(ButtonStyle.Success)
            .setDisabled(action === 'Fulfilled' || action === 'Rejected'),
        new ButtonBuilder()
            .setCustomId(`status_Rejected_${footerText}`)
            .setLabel('Rejected')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(action === 'Rejected'),
        new ButtonBuilder()
            .setCustomId(`edit_${footerText}`)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(action === 'Rejected')
    );
}

// Function to delete original webhook and replace it with an embed with buttons
async function handleNewMessage(message) {
    if (
        message.embeds.length > 0 &&
        message.embeds[0].footer &&
        message.embeds[0].footer.text.includes('ExtensionHook') &&
        message.author.id !== message.client.user.id
    ) {

        const embed = message.embeds[0];
        const row = createButtonRow(embed.footer.text, null);

        try {
            await message.delete();

            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }
}

async function handleButtonInteraction(interaction) {
    if (!interaction.isButton()) return;

    let status, color, title, description;

    // Extract footerText from embed footer
    const footerText = interaction.message.embeds[0]?.footer?.text;
    const idMatch = footerText?.match(/ID:\s*(\d+)/); // Matches "ID: <number>"
    if (!idMatch || !idMatch[1]) {
        console.error('Invalid or missing ID in embed footer:', footerText);
        await interaction.reply({
            content: 'There was an issue processing your request.',
            flags: 64,
        });
        return;
    }

    if (interaction.customId === 'start_form') {
        console.log('start_form button clicked'); // For debugging
        const modal = createExtensionFormModal(); // Call the modal creation function
        await interaction.showModal(modal); // Display the modal
        return; // Exit after showing the modal
    }

    const uniqueId = idMatch[1].trim();

    // Assign status, title, and description based on button action
    const action = interaction.customId.split('_')[1];
    switch (action) {
        case 'Approved':
            status = 'Approved';
            color = '#800080';
            title = '👍 Extension Request - Approved 👍';
            description = 'This extension request has been approved.\nThe participant has been contacted.';
            break;
        case 'WaitingForUpdate':
            status = 'Waiting for Update';
            color = '#FFFF00';
            title = '🕰️ Extension Request - Waiting for Update 🕰️';
            description = 'This extension is still waiting on needed updates.';
            break;
        case 'Fulfilled':
            status = 'Fulfilled';
            color = '#008000';
            title = '✅ Extension Request - Fulfilled ✅';
            description = 'The assignment has been fulfilled! 🥳\nThe request is now closed.';
            break;
        case 'Rejected':
            status = 'Rejected';
            color = '#FF0000';
            title = '⚰️ Extension Request - Rejected ⚰️';
            description = 'This extension has been rejected.\nThe request is now closed.';
            break;
        default:
            await interaction.reply({ content: 'Unknown action.', flags: 64 });
            return;
    }

    await interaction.deferReply({ flags: 64 });

    const data = { discord: interaction.user.username, status, uniqueId };
    try {
        const response = await axios.post(apiURL, data);
        if (response.status !== 200 || response.data.message !== 'Status updated successfully!') {
            throw new Error(`API returned an error: ${response.status} ${response.data.message}`);
        }

        const originalEmbed = interaction.message.embeds[0];

        // Construct fields dynamically
        const embedFields = originalEmbed.fields.map(field => ({
            name: field.name,
            value: field.value || 'Unknown',
            inline: true,
        }));
        embedFields.push({ name: 'Status', value: status, inline: true });

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setDescription(description)
            .setFields(embedFields)
            .setFooter({ text: originalEmbed.footer.text });

        await interaction.message.edit({ embeds: [embed] });
        await interaction.deleteReply();
    } catch (error) {
        console.error('Error handling interaction:', error);
        await interaction.followUp({
            content: 'There was an error processing your request. Please try again later.',
            flags: 64,
        });
    }
}

module.exports = { handleNewMessage, handleButtonInteraction, checkForPastDueExtensions };
