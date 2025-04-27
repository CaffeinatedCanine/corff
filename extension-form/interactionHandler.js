require('dotenv').config();
const axios = require('axios');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createExtensionFormModal } = require('./modalBuilder'); 
const { getExtensionDataWithCache } = require('../utils/dataFetcher');

const apiURL = process.env.API_URL;
const modsRoleId = process.env.MODS_ROLE_ID;
const channelId = process.env.CHANNEL_ID;
const googleSheetLink = process.env.EXTENSION_SHEET;

// Fetch extension data from the external API
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
        console.error(`Error fetching extension data: ${error.message}`);
        return [];
    }
}

// Check for past-due extensions and update embeds
async function checkForPastDueExtensions(client) {
    try {
        const extensionData = await fetchExtensionData(); // Fetch data from the sheet
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            console.error('Channel not found');
            return;
        }

        const messages = await channel.messages.fetch({ limit: 100 });

        messages.forEach(async (message) => {
            const embed = message.embeds[0];
            if (
                embed &&
                embed.footer &&
                embed.footer.text.includes('ExtensionHook')
            ) {
                const uniqueId = embed.footer.text.match(/ID: (\d+)/)?.[1];
                if (!uniqueId) {
                    console.error('Unique ID not found in embed footer.');
                    return;
                }

                const extensionEntry = extensionData.find(entry => entry.uniqueId.toString() === uniqueId);
                if (extensionEntry) {
                    const extensionDate = new Date(extensionEntry.extensionDate);
                    const now = new Date();

                    // Check current status based on the title
                    const title = embed.title || '';
                    const isFulfilled = title.includes('Fulfilled');
                    const isPastDue = title.includes('Past Due');

                    // Skip if the status is "Fulfilled" or "Past Due"
                    if (isFulfilled || isPastDue) {
                        console.log(`Skipping ID: ${uniqueId} - Status is "${isFulfilled ? 'Fulfilled' : 'Past Due'}".`);
                        return;
                    }

                    // Proceed only if the date has passed and the title doesn't indicate "Fulfilled" or "Past Due"
                    if (!isNaN(extensionDate.getTime()) && now > extensionDate) {
                        const newEmbedFields = [
                            { name: 'Extension To', value: extensionDate.toISOString().split('T')[0], inline: true },
                            { name: 'Contact through', value: extensionEntry.preference, inline: true },
                            { name: '', value: '', inline: true },
                            { name: 'AO3 Handle', value: extensionEntry.ao3 || 'N/A', inline: true },
                        ];

                        if (extensionEntry.discord && extensionEntry.discord !== 'system') {
                            newEmbedFields.push({ name: 'Discord', value: extensionEntry.discord, inline: true });
                        }
                        newEmbedFields.push({ name: '', value: '', inline: true });
                        newEmbedFields.push({ name: 'Email', value: extensionEntry.email || 'N/A', inline: false });
                        if (extensionEntry.note) {
                            newEmbedFields.push({ name: 'Note', value: extensionEntry.note });
                        }

                        const newEmbed = new EmbedBuilder()
                            .setTitle('💀 Extension Request - Past Due 💀')
                            .setColor('#FF0000')
                            .setDescription('This extension request is past due.\nPlease take appropriate action.')
                            .setFields(newEmbedFields)
                            .setFooter({ text: embed.footer.text });

                        // Check if the message was sent by the bot itself
                        if (message.author.id === client.user.id) {
                            await message.edit({ embeds: [newEmbed] });

                            // Send an alert to the mods
                            await channel.send({
                                content: `<@&${modsRoleId}> This extension request (ID: ${uniqueId}) is now past due.`,
                                reply: { messageReference: message.id },
                            });
                        }

                        // Update the status in the system
                        const data = {
                            status: 'Past Due',
                            uniqueId,
                        };
                        await axios.post(apiURL, data);
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error checking for past-due extensions: ${error.message}`);
    }
}

// Helper function to create the button row dynamically
function createButtonRow(footerText, action, isUpdated = false) {
    const uniqueId = footerText.match(/ID:\s*(\d+)/)?.[1];
    
    // If the status has been changed through 'Update', unlock all buttons except 'Approved'
    const disableAllExceptUpdate = !isUpdated && (action === 'Fulfilled' || action === 'Rejected');

    const firstRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`status_Approved_${uniqueId}`)
            .setLabel('Approved')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(action === 'Approved' || disableAllExceptUpdate), // Permanently disable 'Approved'        
        new ButtonBuilder()
            .setCustomId(`status_Fulfilled_${uniqueId}`)
            .setLabel('Fulfilled')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disableAllExceptUpdate),
        new ButtonBuilder()
            .setCustomId(`status_Rejected_${uniqueId}`)
            .setLabel('Rejected')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disableAllExceptUpdate), 
    );

    const secondRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`status_WaitingForUpdate_${uniqueId}`)
            .setLabel('Waiting for Update')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disableAllExceptUpdate),        
        new ButtonBuilder()
            .setCustomId(`update:${uniqueId}`)
            .setLabel('Update')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(false)
    );
       
    return [firstRow, secondRow];
}

// Handle webhook embeds and attach buttons
async function handleNewMessage(message) {
    if (
        message.embeds.length > 0 &&
        message.embeds[0].footer &&
        message.embeds[0].footer.text.includes('ExtensionHook') &&
        message.author.id !== message.client.user.id // Ensure the message is not from the bot itself
    ) {
        const embed = message.embeds[0];
        const row = createButtonRow(embed.footer.text, null);

        try {
            // Delete the original message and resend it with interactive buttons
            await message.delete();
            await message.channel.send({ 
                    content: `Go to the [Extension gSheet](${googleSheetLink}) to make changes.`,
                    embeds: [embed], 
                    components: row 
                });
        } catch (error) {
            console.error(`Error processing message: ${error.message}`);
        }
    }
}

// Utility function to handle replies gracefully
async function safeReply(interaction, content, ephemeral = false) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content, ephemeral });
        } else if (interaction.deferred) {
            await interaction.followUp({ content, ephemeral });
        }
    } catch (error) {
        console.warn(`Failed to send reply: ${error.message}`);
    }
}

// Main interaction handler
async function handleButtonInteraction(interaction) {
    if (!interaction.isButton()) return;

    try {
        const customId = interaction.customId;

        // **Handle "Submit Extension Request" Button**
        if (customId === 'start_form') {
            console.log('Submit Extension Request button clicked.');
            const modal = createExtensionFormModal();
            await interaction.showModal(modal);
            return;
        }

        // **Handle "Update" Button**
        if (customId.startsWith('update:')) {
            const uniqueId = customId.split(':')[1];
            if (!uniqueId || isNaN(uniqueId)) {
                console.error(`Invalid or missing unique ID in update button: ${customId}`);
                await safeReply(interaction, 'Invalid unique ID for update. Please contact support.', true);
                return;
            }

            console.log(`Update button clicked for uniqueId: ${uniqueId}`);

            try {
                const entry = await getExtensionDataWithCache(uniqueId);
                if (!entry) {
                    await safeReply(interaction, 'Failed to retrieve updated data. Please try again later.', true);
                    return;
                }

                const formattedDate = entry.extensionDate?.split('T')[0] || 'N/A';

                // Hardcoded titles and descriptions for recognized statuses
                let title = `Extension Request - ID: ${uniqueId}`;
                let color = '#0099ff'; 
                let description = 'Updated information from the system.';

                switch (entry.status.toLowerCase()) {
                    case 'approved':
                        title = '👍 Extension Request - Approved 👍';
                        color = '#800080';
                        description = 'This extension request has been approved.\nThe participant has been contacted.';
                        break;
                    case 'waiting for update':
                        title = '🕰️ Extension Request - Waiting for Update 🕰️';
                        color = '#FFFF00';
                        description = 'The request is waiting for additional updates.\nSee eventual notes below.';
                        break;
                    case 'fulfilled':
                        title = '✅ Extension Request - Fulfilled ✅';
                        color = '#008000';
                        description = 'The assignment has been fulfilled. 🎉';
                        break;
                    case 'rejected':
                        title = '❌ Extension Request - Rejected ❌';
                        color = '#FF0000';
                        description = 'This extension request has been rejected.';
                        break;
                    case 'past due':
                        title = '💀 Extension Request - Past Due 💀';
                        color = '#FF4500';
                        description = 'This extension request is past due.\nPlease take immediate action.';
                        break;
                    default:
                        description = `Status: ${entry.status}`;
                }

                const embedFields = [
                    { name: 'Extension To', value: formattedDate, inline: true },
                    { name: 'Contact Through', value: entry.preference || 'N/A', inline: true },
                    { name: '', value: '', inline: true },
                    { name: 'AO3 Handle', value: entry.ao3 || 'N/A', inline: true },
                ];

                if (entry.discord && entry.discord !== 'system') {
                    embedFields.push({ name: 'Discord', value: entry.discord, inline: true });
                }
                embedFields.push({ name: '', value: '', inline: true });
                embedFields.push({ name: 'Email', value: entry.email || 'N/A', inline: false });
                if (entry.note) {
                    embedFields.push({ name: 'Note', value: entry.note, inline: false });
                }

                const updatedEmbed = new EmbedBuilder()
                    .setTitle(title)
                    .setColor(color)
                    .setDescription(description)
                    .addFields(embedFields)
                    .setFooter(interaction.message.embeds[0]?.footer);

                    const updatedButtonRow = createButtonRow(interaction.message.embeds[0]?.footer?.text, entry.status, true);

                    await interaction.message.edit({
                        embeds: [updatedEmbed],
                        components: updatedButtonRow
                    });

                await safeReply(interaction, 'Embed updated successfully!', true);
            } catch (error) {
                console.error(`Error handling update button: ${error.message}`);
                await safeReply(interaction, 'An error occurred while updating the embed. Please try again later.', true);
            }

            return;
        }

        // **Handle "Status" Button**
        if (customId.startsWith('status_')) {
            const parts = customId.split('_');
            const action = parts[1];
            const uniqueId = parts[2];

            if (!action || !uniqueId || isNaN(uniqueId)) {
                console.error(`Invalid or missing unique ID in status button: ${customId}`);
                await safeReply(interaction, 'Invalid action or unique ID. Please contact support.', true);
                return;
            }

            console.log(`Status button clicked for uniqueId: ${uniqueId}, action: ${action}`);

            const statusMap = {
                Approved: {
                    status: 'Approved',
                    color: '#800080',
                    title: '👍 Extension Request - Approved 👍',
                    description: 'This extension request has been approved.\nThe participant has been contacted.',
                },
                WaitingForUpdate: {
                    status: 'Waiting for Update',
                    color: '#FFFF00',
                    title: '🕰️ Extension Request - Waiting for Update 🕰️',
                    description: 'The request is waiting for additional updates.\nSee eventual notes below.',
                },
                Fulfilled: {
                    status: 'Fulfilled',
                    color: '#008000',
                    title: '✅ Extension Request - Fulfilled ✅',
                    description: 'The assignment has been fulfilled. 🎉',
                },
                Rejected: {
                    status: 'Rejected',
                    color: '#FF0000',
                    title: '❌ Extension Request - Rejected ❌',
                    description: 'This extension request has been rejected.',
                },
            };

            const statusUpdate = statusMap[action];
            if (!statusUpdate) {
                console.error(`Invalid action triggered: ${action}`);
                await safeReply(interaction, `Unknown action: ${action}. Please contact support if this persists.`, true);
                return;
            }

            // Update embed
            const updatedEmbed = new EmbedBuilder()
                .setTitle(statusUpdate.title)
                .setColor(statusUpdate.color)
                .setDescription(statusUpdate.description)
                .setFields(
                    interaction.message.embeds[0].fields.map(field =>
                        field.name === 'Status' ? { name: 'Status', value: statusUpdate.status, inline: true } : field
                    )
                )
                .setFooter(interaction.message.embeds[0]?.footer);

            const buttonRows = createButtonRow(interaction.message.embeds[0]?.footer?.text, action);

            await interaction.message.edit({ 
                        embeds: [updatedEmbed],
                        components: buttonRows
                    });
            
            // Update the sheet with the new status
            try {
                await axios.post(process.env.API_URL, {
                    uniqueId,
                    status: statusUpdate.status,
                });
                console.log(`Status updated in the sheet for uniqueId: ${uniqueId}, action: ${action}`);
                await safeReply(interaction, `Status updated to: ${statusUpdate.status}`, true);
            } catch (error) {
                console.error(`Failed to update status in sheet: ${error.message}`);
                await safeReply(interaction, 'Failed to update status in the sheet. Please contact support.', true);
            }

            return;
        }

        // **Handle Unknown Button Actions**
        console.error(`Unknown button interaction custom ID: ${customId}`);
        await safeReply(interaction, 'Unknown button action. Please contact support.', true);
    } catch (error) {
        console.error(`Error handling button interaction: ${error.message}`);
        if (error.code === 10062) {
            console.log('Interaction expired. Cannot process further.');
            return;
        }

        await safeReply(interaction, 'An unexpected error occurred while processing your request. Please try again.', true);
    }
}

module.exports = {
    fetchExtensionData,
    createButtonRow,
    checkForPastDueExtensions,
    handleNewMessage,
    handleButtonInteraction,
};
