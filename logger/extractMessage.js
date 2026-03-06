function extractMessageData(message) {
    return {
        messageId: message.id,
        author: message.author ? {
            id: message.author.id,
            username: message.author.username,
            avatar: message.author.displayAvatarURL(),
        } : null,
        content: message.content || null,
        images: [...message.attachments.values()].map(a => a.url),
        embeds: message.embeds.map(embed => ({
            title: embed.title,
            description: embed.description,
            fields: embed.fields.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline
            })),
            footer: embed.footer?.text || null,
            timestamp: embed.timestamp,
            url: embed.url,
            color: embed.color,
            image: embed.image?.url || null,
            thumbnail: embed.thumbnail?.url || null,
        })),
        createdTimestamp: message.createdTimestamp,
        channelId: message.channelId,
        guildId: message.guildId,
    };
}

module.exports = extractMessageData;