const buildJoinEmbed = require("./embeds/joinEmbed.js");
const buildLeaveEmbed = require("./embeds/leaveEmbed.js");
const getLogChannel = require("./getLogChannel.js");

const inviteCache = new Map();

async function cacheInvites(guild) {
  const botMember = guild.members.me;
  if (!botMember.permissions.has("ManageGuild")) {
    console.warn(
      `⚠️  Missing "Manage Server" permission in ${guild.name} — invite tracking disabled`
    );
    return;
  }

  try {
    const invites = await guild.invites.fetch();
    inviteCache.set(
      guild.id,
      new Map(invites.map((inv) => [inv.code, inv.uses]))
    );
    console.log(`✅ Cached ${invites.size} invites for ${guild.name}`);
  } catch (error) {
    if (error.code === 50013) {
      console.warn(`⚠️  Missing permissions to fetch invites in ${guild.name}`);
    } else {
      console.error(
        `Failed to cache invites for ${guild.name}:`,
        error.message
      );
    }
  }
}

function getInviteCache(guildId) {
  return inviteCache.get(guildId) || new Map();
}

async function logUserJoin(member) {
  const logChannel = getLogChannel(member.guild, "joinLeave");
  if (!logChannel) return;

  let usedInvite = null;

  if (inviteCache.has(member.guild.id)) {
    try {
      const newInvites = await member.guild.invites.fetch();
      const oldInvites = getInviteCache(member.guild.id);

      for (const [code, invite] of newInvites) {
        const oldUses = oldInvites.get(code) || 0;
        if (invite.uses > oldUses) {
          usedInvite = invite;
          break;
        }
      }

      inviteCache.set(
        member.guild.id,
        new Map(newInvites.map((inv) => [inv.code, inv.uses]))
      );
    } catch (error) {
      console.error("Failed to track invite:", error.message);
    }
  }

  const embed = buildJoinEmbed(member, usedInvite);
  logChannel.send({ embeds: [embed] });
}

async function logUserLeave(member) {
  const logChannel = getLogChannel(member.guild, "joinLeave");
  if (!logChannel) return;

  let leaveType = "leave";
  let executor = null;
  let reason = null;

  try {
    const banLogs = await member.guild.fetchAuditLogs({
      limit: 1,
      type: 22,
    });
    const banLog = banLogs.entries.first();

    if (banLog && banLog.target.id === member.id) {
      const logTime = banLog.createdTimestamp;
      const now = Date.now();
      if (now - logTime < 5000) {
        leaveType = "ban";
        executor = banLog.executor;
        reason = banLog.reason;
      }
    }

    if (leaveType === "leave") {
      const kickLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: 20,
      });
      const kickLog = kickLogs.entries.first();

      if (kickLog && kickLog.target.id === member.id) {
        const logTime = kickLog.createdTimestamp;
        const now = Date.now();
        if (now - logTime < 5000) {
          leaveType = "kick";
          executor = kickLog.executor;
          reason = kickLog.reason;
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch audit logs:", error.message);
  }

  const embed = buildLeaveEmbed(member, leaveType, executor, reason);
  logChannel.send({ embeds: [embed] });
}

module.exports = {
  logUserJoin,
  logUserLeave,
  cacheInvites,
  getInviteCache,
};
