const { EmbedBuilder } = require("discord.js");

function buildJoinEmbed(member, usedInvite) {
  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("Member Joined")
    .setAuthor({
      name: member.user.username,
      iconURL: member.user.displayAvatarURL(),
    })
    .setDescription(`${member} joined the server`)
    .addFields(
      { name: "User ID", value: member.id },
      {
        name: "Account Created",
        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
      }
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 1024 }))
    .setTimestamp();

  if (usedInvite) {
    const inviter = usedInvite.inviter;
    embed.addFields({
      name: "Invite Used",
      value: inviter
        ? `discord.gg/${usedInvite.code} (created by ${inviter.tag})`
        : `discord.gg/${usedInvite.code} (vanity/unknown)`,
    });
  } else {
    embed.addFields({
      name: "Invite Used",
      value: "Unable to determine (missing permissions or no invite data)",
    });
  }

  return embed;
}

module.exports = buildJoinEmbed;
