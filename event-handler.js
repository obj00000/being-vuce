// Load event handlers
const fs = require('fs');
const path = require('path');

module.exports = {
  // Register all events from the events folder
  registerEvents(client) {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
      const event = require(`./events/${file}`);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      
      console.log(`Registered event: ${event.name}`);
    }
    
    // Register anti-nuke events
    const { registerAntiNukeEvents } = require('./events/antiNukeEvents');
    registerAntiNukeEvents(client);
    
    console.log('All events registered successfully!');
  },
  
  // Sample event files structure
  // Below is just for reference, these should be in separate files
  
  /*
  // events/ready.js
  module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
      console.log(`Ready! Logged in as ${client.user.tag}`);
      client.user.setActivity('&help | Protecting servers');
    }
  };
  
  // events/guildMemberAdd.js
  module.exports = {
    name: 'guildMemberAdd',
    execute(member, client) {
      // Welcome logic
      const settings = client.welcomeSettings?.get(member.guild.id);
      if (settings?.enabled && settings?.channelId) {
        const channel = member.guild.channels.cache.get(settings.channelId);
        if (channel) {
          const welcomeMsg = settings.message
            .replace(/{user}/g, member)
            .replace(/{server}/g, member.guild.name)
            .replace(/{count}/g, member.guild.memberCount);
            
          channel.send(welcomeMsg).catch(console.error);
        }
      }
    }
  };
  
  // events/voiceStateUpdate.js
  module.exports = {
    name: 'voiceStateUpdate',
    execute(oldState, newState, client) {
      // Handle join to create voice channels
      if (!client.invcSettings) return;
      
      const settings = client.invcSettings.get(newState.guild.id);
      if (!settings || !settings.enabled) return;
      
      // If user joined the "Join to Create" channel
      if (newState.channelId === settings.channelId && !oldState.channelId) {
        // Create a new voice channel
        newState.guild.channels.create({
          name: `${newState.member.displayName}'s Channel`,
          type: ChannelType.GuildVoice,
          parent: newState.channel.parent,
          permissionOverwrites: [
            {
              id: newState.member.id,
              allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers]
            }
          ]
        }).then(channel => {
          // Move the user to the new channel
          newState.member.voice.setChannel(channel.id).catch(console.error);
          
          // Track temporary channels
          if (!client.tempChannels) client.tempChannels = new Map();
          client.tempChannels.set(channel.id, true);
        }).catch(console.error);
      }
      
      // If user left a temporary channel and it's empty, delete it
      if (oldState.channelId && client.tempChannels?.has(oldState.channelId)) {
        const channel = oldState.guild.channels.cache.get(oldState.channelId);
        if (channel && channel.members.size === 0) {
          channel.delete().catch(console.error);
          client.tempChannels.delete(oldState.channelId);
        }
      }
    }
  };
  */
}