// commands/music/play.js
// Note: This example uses discord-player package for music functionality
const { EmbedBuilder } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
  name: 'play',
  description: 'Play a song in your voice channel',
  aliases: ['p'],
  usage: '&play <song name or URL>',
  category: 'music',
  
  async execute(client, message, args) {
    // Check if user is in a voice channel
    if (!message.member.voice.channel) {
      return message.reply('You need to be in a voice channel to use this command!');
    }
    
    // Check if bot has permission to join and speak
    const permissions = message.member.voice.channel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('I need permission to join and speak in your voice channel!');
    }
    
    // Check if arguments are provided
    if (!args.length) {
      return message.reply('Please provide a song name or URL!');
    }
    
    // Get the search query
    const searchQuery = args.join(' ');
    
    // Show loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor('#FFFF00')
      .setDescription('🔍 Searching for your song...');
    
    const loadingMessage = await message.reply({ embeds: [loadingEmbed] });
    
    try {
      // Initialize the player if not already done
      if (!client.player) {
        const { Player } = require('discord-player');
        client.player = new Player(client);
        await client.player.extractors.loadDefault();
      }
      
      // Search for the song
      const searchResult = await client.player.search(searchQuery, {
        requestedBy: message.author,
        searchEngine: QueryType.AUTO
      });
      
      // If no tracks were found
      if (!searchResult || !searchResult.tracks.length) {
        return loadingMessage.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setDescription('❌ No results found!')
          ]
        });
      }
      
      // Create or get the queue for this guild
      const queue = await client.player.nodes.create(message.guild, {
        metadata: {
          channel: message.channel,
          client: message.guild.members.me,
          requestedBy: message.author
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000, // 5 minutes
        leaveOnEnd: true,
        leaveOnEndCooldown: 300000 // 5 minutes
      });
      
      // Connect to the voice channel
      try {
        if (!queue.connection) {
          await queue.connect(message.member.voice.channel);
        }
      } catch (err) {
        client.player.nodes.delete(message.guild.id);
        return loadingMessage.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setDescription('❌ Could not join your voice channel!')
          ]
        });
      }
      
      // Add the track to the queue
      const track = searchResult.tracks[0];
      queue.addTrack(track);
      
      // If not playing, start the player
      if (!queue.isPlaying()) {
        await queue.node.play();
      }
      
      // Create the success embed
      const playEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Added to Queue')
        .setThumbnail(track.thumbnail)
        .setDescription(`[${track.title}](${track.url})`)
        .addFields(
          { name: 'Duration', value: track.duration, inline: true },
          { name: 'Requested By', value: track.requestedBy.tag, inline: true },
          { name: 'Position in Queue', value: queue.tracks.data.length > 0 ? `${queue.tracks.data.length}` : 'Now Playing', inline: true }
        );
      
      // Update the loading message
      await loadingMessage.edit({ embeds: [playEmbed] });
      
    } catch (error) {
      console.error('Music play error:', error);
      await loadingMessage.edit({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('❌ There was an error while playing music! Please try again later.')
        ]
      });
    }
  }
};
