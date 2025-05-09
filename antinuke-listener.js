// events/antiNukeEvents.js
// This file handles the anti-nuke detection and prevention

const { EmbedBuilder, AuditLogEvent } = require('discord.js');

// Function to log and punish potential nuke events
async function handlePotentialNuke(guild, executor, actionType, targetId, client) {
  // Get guild settings
  if (!client.antinuke) return;
  const settings = client.antinuke.get(guild.id);
  
  // If anti-nuke is disabled for this guild, return
  if (!settings || !settings.enabled) return;
  
  // If the executor is whitelisted, ignore
  if (settings.whitelistedUsers.includes(executor.id)) return;
  
  // Check if executor has a whitelisted role
  const member = await guild.members.fetch(executor.id).catch(() => null);
  if (member) {
    const hasWhitelistedRole = member.roles.cache.some(role => settings.whitelistedRoles.includes(role.id));
    if (hasWhitelistedRole) return;
  }
  
  // Get the log channel
  const logChannel = guild.channels.cache.get(settings.logChannel);
  
  // Implement the punishment
  try {
    // Take action against the executor
    switch (settings.punishAction) {
      case 'ban':
        await guild.members.ban(executor.id, { reason: `Anti-Nuke: ${actionType}` });
        break;
      case 'kick':
        if (member) await member.kick(`Anti-Nuke: ${actionType}`);
        break;
      case 'strip':
        if (member) {
          // Remove all roles from the executor
          for (const role of member.roles.cache.values()) {
            if (role.name !== '@everyone' && role.editable) {
              await member.roles.remove(role, `Anti-Nuke: ${actionType}`);
            }
          }
        }
        break;
    }
    
    // Log the action
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚠️ Anti-Nuke Protection Triggered')
        .setDescription(`Potential nuke attempt detected`)
        .addFields(
          { name: 'Action', value: actionType, inline: true },
          { name: 'Executor', value: `${executor.tag} (${executor.id})`, inline: true },
          { name: 'Punishment', value: settings.punishAction, inline: true },
          { name: 'Target ID', value: targetId || 'N/A', inline: true },
          { name: 'Time', value: new Date().toLocaleString(), inline: true }
        )
        .setTimestamp();
        
      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Anti-nuke error:', error);
    if (logChannel) {
      await logChannel.send(`Failed to punish executor in anti-nuke system: ${error.message}`);
    }
  }
}

// Handler for channel deletions
const handleChannelDelete = async (channel, client) => {
  // Ignore DM channels
  if (!channel.guild) return;
  
  try {
    // Fetch the audit logs for this action
    const auditLogs = await channel.guild.fetchAuditLogs({
      type: AuditLogEvent.ChannelDelete,
      limit: 1
    });
    
    // Get the executor
    const { executor } = auditLogs.entries.first();
    
    // Skip if the executor is the bot itself or the system
    if (executor.id === client.user.id || executor.id === channel.guild.id) return;
    
    // Handle as potential nuke
    await handlePotentialNuke(channel.guild, executor, 'Channel Deletion', channel.id, client);
  } catch (error) {
    console.error('Error in channel delete handler:', error);
  }
};

// Handler for role deletions
const handleRoleDelete = async (role, client) => {
  try {
    // Fetch the audit logs for this action
    const auditLogs = await role.guild.fetchAuditLogs({
      type: AuditLogEvent.RoleDelete,
      limit: 1
    });
    
    // Get the executor
    const { executor } = auditLogs.entries.first();
    
    // Skip if the executor is the bot itself or the system
    if (executor.id === client.user.id || executor.id === role.guild.id) return;
    
    // Handle as potential nuke
    await handlePotentialNuke(role.guild, executor, 'Role Deletion', role.id, client);
  } catch (error) {
    console.error('Error in role delete handler:', error);
  }
};

// Handler for member kicks
const handleGuildMemberRemove = async (member, client) => {
  try {
    // Fetch the audit logs for kick actions
    const kickAuditLogs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberKick,
      limit: 5
    });
    
    // Find the relevant kick log
    const kickLog = kickAuditLogs.entries.find(log => 
      log.target.id === member.id &&
      log.createdTimestamp > Date.now() - 5000 // Within the last 5 seconds
    );
    
    if (kickLog) {
      const { executor } = kickLog;
      
      // Skip if the executor is the bot itself
      if (executor.id === client.user.id) return;
      
      // Handle as potential nuke
      await handlePotentialNuke(member.guild, executor, 'Member Kick', member.id, client);
    }
    
    // Also check for bans
    const banAuditLogs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 5
    });
    
    // Find the relevant ban log
    const banLog = banAuditLogs.entries.find(log => 
      log.target.id === member.id &&
      log.createdTimestamp > Date.now() - 5000 // Within the last 5 seconds
    );
    
    if (banLog) {
      const { executor } = banLog;
      
      // Skip if the executor is the bot itself
      if (executor.id === client.user.id) return;
      
      // Handle as potential nuke
      await handlePotentialNuke(member.guild, executor, 'Member Ban', member.id, client);
    }
  } catch (error) {
    console.error('Error in member remove handler:', error);
  }
};

// Handler for mass member bans
const handleBanAdd = async (ban, client) => {
  try {
    // Get executor of the ban
    const auditLogs = await ban.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 1
    });
    
    const { executor } = auditLogs.entries.first();
    
    // Skip if the executor is the bot itself
    if (executor.id === client.user.id) return;
    
    // Check for mass bans (can be customized based on your threshold)
    const recentBans = await ban.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 10
    });
    
    // Count how many bans were executed by this user in the last minute
    const lastMinute = Date.now() - 60000;
    const recentBansByExecutor = recentBans.entries.filter(log => 
      log.executor.id === executor.id && 
      log.createdTimestamp > lastMinute
    );
    
    // If more than 3 bans in the last minute, treat as nuke
    if (recentBansByExecutor.size >= 3) {
      await handlePotentialNuke(ban.guild, executor, 'Mass Bans', ban.user.id, client);
    }
  } catch (error) {
    console.error('Error in ban add handler:', error);
  }
};

// Handler for webhook creations (often used in nukes)
const handleWebhookCreate = async (webhook, client) => {
  try {
    const auditLogs = await webhook.guild.fetchAuditLogs({
      type: AuditLogEvent.WebhookCreate,
      limit: 1
    });
    
    const { executor } = auditLogs.entries.first();
    
    // Skip if the executor is the bot itself
    if (executor.id === client.user.id) return;
    
    // Handle as potential nuke
    await handlePotentialNuke(webhook.guild, executor, 'Webhook Creation', webhook.id, client);
  } catch (error) {
    console.error('Error in webhook create handler:', error);
  }
};

// Handler for permission updates (often changed in nukes)
const handleRoleUpdate = async (oldRole, newRole, client) => {
  try {
    // Check for significant permission changes
    const oldPermissions = oldRole.permissions.bitfield;
    const newPermissions = newRole.permissions.bitfield;
    
    // If permissions changed and now include ADMINISTRATOR or other sensitive permissions
    if (oldPermissions !== newPermissions) {
      const sensitivePermissions = [
        'Administrator',
        'BanMembers',
        'KickMembers',
        'ManageGuild',
        'ManageRoles',
        'ManageWebhooks',
        'ManageChannels'
      ];
      
      // Check if any sensitive permissions were added
      const sensitiveAdded = sensitivePermissions.some(perm => 
        !oldRole.permissions.has(perm) && newRole.permissions.has(perm)
      );
      
      if (sensitiveAdded) {
        const auditLogs = await newRole.guild.fetchAuditLogs({
          type: AuditLogEvent.RoleUpdate,
          limit: 1
        });
        
        const { executor } = auditLogs.entries.first();
        
        // Skip if the executor is the bot itself
        if (executor.id === client.user.id) return;
        
        // Handle as potential nuke
        await handlePotentialNuke(
          newRole.guild, 
          executor, 
          'Sensitive Permission Added to Role', 
          newRole.id,
          client
        );
      }
    }
  } catch (error) {
    console.error('Error in role update handler:', error);
  }
};

// Register all event handlers
module.exports = {
  registerAntiNukeEvents(client) {
    client.on('channelDelete', channel => handleChannelDelete(channel, client));
    client.on('roleDelete', role => handleRoleDelete(role, client));
    client.on('guildMemberRemove', member => handleGuildMemberRemove(member, client));
    client.on('guildBanAdd', ban => handleBanAdd(ban, client));
    client.on('webhookCreate', webhook => handleWebhookCreate(webhook, client));
    client.on('roleUpdate', (oldRole, newRole) => handleRoleUpdate(oldRole, newRole, client));
    
    console.log('Anti-nuke protection system registered');
  }
};
