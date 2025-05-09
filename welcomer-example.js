// commands/welcomer/welcome.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'welcome',
  description: 'Configure welcome messages for your server',
  aliases: ['welcomer', 'setwelcome'],
  usage: '&welcome <enable/disable/test/channel/message>',
  category: 'welcomer',
  
  async execute(client, message, args) {
    // Check if user has admin permissions
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }
    
    if (!args[0]) {
      return message.reply('Please specify an action: `enable`, `disable`, `test`, `channel`, or `message`.');
    }
    
    const action = args[0].toLowerCase();
    
    // Example database structure (in reality, use a proper database)
    if (!client.welcomeSettings) client.welcomeSettings = new Map();
    
    const guildId = message.guild.id;
    let settings = client.welcomeSettings.get(guildId) || {
      enabled: false,
      channelId: null,
      message: 'Welcome {user} to {server}! You are member #{count}.'
    };
    
    switch (action) {
      case 'enable':
        // Check if channel is set
        if (!settings.channelId) {
          return message.reply('Please set a welcome channel first using `&welcome channel #channel`.');
        }
        
        settings.enabled = true;
        client.welcomeSettings.set(guildId, settings);
        
        return message.reply('Welcome messages have been enabled!');
        
      case 'disable':
        settings.enabled = false;
        client.welcomeSettings.set(guildId, settings);
        
        return message.reply('Welcome messages have been disabled.');
        
      case 'test':
        // Check if welcome is enabled
        if (!settings.enabled) {
          return message.reply('Welcome messages are currently disabled. Enable them first with `&welcome enable`.');
        }
        
        // Check if channel exists
        const welcomeChannel = message.guild.channels.cache.get(settings.channelId);
        if (!welcomeChannel) {
          return message.reply('The welcome channel no longer exists. Please set a new one with `&welcome channel #channel`.');
        }
        
        // Format welcome message
        let welcomeMessage = settings.message
          .replace(/{user}/g, message.author)
          .replace(/{server}/g, message.guild.name)
          .replace(/{count}/g, message.guild.memberCount);
        
        // Send test welcome message
        try {
          await welcomeChannel.send(welcomeMessage);
          return message.reply('Test welcome message sent!');
        } catch (error) {
          console.error('Welcome test error:', error);
          return message.reply('Failed to send test welcome message. Please check my permissions in the welcome channel.');
        }
        
      case 'channel':
        const channel = message.mentions.channels.first();
        if (!channel) {
          return message.reply('Please mention a channel, e.g., `&welcome channel #welcome`.');
        }
        
        // Check if bot has permissions in that channel
        if (!channel.permissionsFor(message.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
          return message.reply('I don\'t have permission to send messages in that channel!');
        }
        
        settings.channelId = channel.id;
        client.welcomeSettings.set(guildId, settings);
        
        return message.reply(`Welcome channel set to ${channel}!`);
        
      case 'message':
        const newMessage = args.slice(1).join(' ');
        if (!newMessage) {
          return message.reply('Please provide a welcome message. You can use {user}, {server}, and {count} as placeholders.');
        }
        
        settings.message = newMessage;
        client.welcomeSettings.set(guildId, settings);
        
        const previewEmbed = new EmbedBuilder()
          .setColor('#00FFFF')
          .setTitle('Welcome Message Set')
          .setDescription('Your new welcome message has been set!')
          .addFields(
            { name: 'Preview', value: newMessage
              .replace(/{user}/g, message.author)
              .replace(/{server}/g, message.guild.name)
              .replace(/{count}/g, message.guild.memberCount) 
            }
          )
          .setFooter({ text: 'Use "&welcome test" to send a test message.' });
          
        return message.reply({ embeds: [previewEmbed] });
        
      default:
        return message.reply('Invalid action. Please use `enable`, `disable`, `test`, `channel`, or `message`.');
    }
  }
};

// Event handler for new members (to be placed in events folder)
/*
// events/guildMemberAdd.js
module.exports = {
  name: 'guildMemberAdd',
  execute: async (member, client) => {
    const settings = client.welcomeSettings.get(member.guild.id);
    
    // Check if welcome messages are enabled for this guild
    if (!settings || !settings.enabled) return;
    
    // Get the welcome channel
    const welcomeChannel = member.guild.channels.cache.get(settings.channelId);
    if (!welcomeChannel) return;
    
    // Format welcome message
    let welcomeMessage = settings.message
      .replace(/{user}/g, member)
      .replace(/{server}/g, member.guild.name)
      .replace(/{count}/g, member.guild.memberCount);
    
    // Send welcome message
    try {
      await welcomeChannel.send(welcomeMessage);
    } catch (error) {
      console.error(`Failed to send welcome message in guild ${member.guild.id}:`, error);
    }
  }
};
*/