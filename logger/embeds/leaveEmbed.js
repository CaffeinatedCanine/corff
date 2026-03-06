const { EmbedBuilder } = require("discord.js");

function buildLeaveEmbed(member, leaveType, executor, reason) {
  const colors = {
    leave: "Red",
    kick: "Orange",
    ban: "DarkRed",
  };

  const titles = {
    leave: "Member Left",
    kick: "Member Kicked",
    ban: "Member Banned",
  };

  const descriptions = {
    leave: `<@${member.user.id}> left the server`,
    kick: `<@${member.user.id}> was kicked from the server`,
    ban: `<@${member.user.id}> was banned from the server`,
  };

  const embed = new EmbedBuilder()
    .setColor(colors[leaveType] || "Red")
    .setTitle(titles[leaveType] || "Member Left")
    .setAuthor({
      name: member.user.username,
      iconURL: member.user.displayAvatarURL(),
    })
    .setDescription(descriptions[leaveType] || descriptions.leave)
    .addFields(
      { name: "User ID", value: member.id },
      {
        name: "Roles",
        value:
          member.roles.cache.size > 0
            ? member.roles.cache.map((r) => r.toString()).join(", ")
            : "No roles",
      },
      {
        name: "Joined Server",
        value: member.joinedTimestamp
          ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
          : "Unknown",
      }
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 1024 }))
    .setTimestamp();

  if (executor && (leaveType === "kick" || leaveType === "ban")) {
    embed.addFields({
      name: leaveType === "ban" ? "Banned by" : "Kicked by",
      value: `${executor.tag} (${executor.id})`,
    });
  }

  // Add reason if available
  if (reason) {
    embed.addFields({
      name: "Reason",
      value: reason,
    });
  } else if (leaveType === "kick" || leaveType === "ban") {
    embed.addFields({
      name: "Reason",
      value: "*No reason provided*",
    });
  }

  return embed;
}

module.exports = buildLeaveEmbed;
