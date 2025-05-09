// commands/moderation/ban.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'ban',
  description: 'Ban a member from the server',
  aliases: ['banish', 'yeet'],
  usage: '&ban <user> [reason]',
  category: 'moderation',
  
  async execute(client, message, args) {
    // Check if user has ban permissions
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('You need Ban Members permission to use this command.');
    }
    
    // Check if the bot has ban permissions
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('I need Ban Members permission to execute this command.');
    }
    
    if (!args[0]) {
      return message.reply('Please mention a user or provide a user ID to ban.');
    }
    
    const targetUser = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    
    if (!targetUser) {
      return message.reply('Could not find that user in this server.');
    }
    
    // Check if the target user is bannable
    if (!targetUser.bannable) {
      return message.reply('I cannot ban this user. They may have higher permissions than me.');
    }
    
    // Check if the target user has higher role than the command user
    if (message.member.roles.highest.position <= targetUser.roles.highest.position && message.guild.ownerId !== message.author.id) {
      return message.reply('You cannot ban this user as they have equal or higher roles than you.');
    }
    
    // Get reason
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    // Ban the user
    try {
      await targetUser.ban({ reason: `Banned by ${message.author.tag} | Reason: ${reason}` });
      
      const banEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('User Banned')
        .setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Banned User', value: `${targetUser.user.tag} (${targetUser.id})`, inline: false },
          { name: 'Banned By', value: `${message.author.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Date', value: new Date().toLocaleString(), inline: true }
        );
        
      message.reply({ embeds: [banEmbed] });
      
      // Send DM to banned user if possible
      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle(`You've been banned from ${message.guild.name}`)
              .addFields(
                { name: 'Banned By', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: true }
              )
          ]
        });
      } catch (err) {
        // User may have DMs closed
        console.log(`Could not send DM to ${targetUser.user.tag}`);
      }
      
    } catch (error) {
      console.error('Ban error:', error);
      message.reply('There was an error banning this user. Please check my permissions and try again.');
    }
  }
};
