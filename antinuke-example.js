// commands/antinuke/antinuke.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'antinuke',
  description: 'Configure anti-nuke protection for your server',
  aliases: ['an', 'nuke-protect'],
  usage: '&antinuke <enable/disable/status>',
  category: 'antinuke',
  
  async execute(client, message, args) {
    // Check if user has admin permissions
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }
    
    if (!args[0]) {
      return message.reply('Please specify an action: `enable`, `disable`, or `status`.');
    }
    
    const action = args[0].toLowerCase();
    
    // Example database structure (in reality, use a proper database)
    if (!client.antinuke) client.antinuke = new Map();
    
    const guildId = message.guild.id;
    
    switch (action) {
      case 'enable':
        client.antinuke.set(guildId, {
          enabled: true,
          logChannel: message.channel.id, // Default to current channel
          punishAction: 'ban',            // Default action
          whitelistedUsers: [message.guild.ownerId],
          whitelistedRoles: []
        });
        
        const enableEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Anti-Nuke Protection Enabled')
          .setDescription('Your server is now protected against nuking attempts.')
          .addFields(
            { name: 'Log Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Punishment', value: 'Ban', inline: true },
            { name: 'Whitelisted Users', value: '1 (Server Owner)', inline: true }
          )
          .setFooter({ text: 'Use "&antinuke settings" to configure' });
          
        return message.reply({ embeds: [enableEmbed] });
        
      case 'disable':
        client.antinuke.set(guildId, { enabled: false });
        
        const disableEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('Anti-Nuke Protection Disabled')
          .setDescription('Your server is no longer protected against nuking attempts.');
          
        return message.reply({ embeds: [disableEmbed] });
        
      case 'status':
        const settings = client.antinuke.get(guildId) || { enabled: false };
        
        const statusEmbed = new EmbedBuilder()
          .setColor(settings.enabled ? '#00FF00' : '#FF0000')
          .setTitle('Anti-Nuke Protection Status')
          .setDescription(`Anti-Nuke is currently **${settings.enabled ? 'Enabled' : 'Disabled'}**`);
          
        if (settings.enabled) {
          statusEmbed.addFields(
            { name: 'Log Channel', value: `<#${settings.logChannel}>`, inline: true },
            { name: 'Punishment', value: settings.punishAction, inline: true },
            { name: 'Whitelisted Users', value: `${settings.whitelistedUsers.length}`, inline: true }
          );
        }
        
        return message.reply({ embeds: [statusEmbed] });
        
      default:
        return message.reply('Invalid action. Please use `enable`, `disable`, or `status`.');
    }
  }
};
