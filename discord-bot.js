// Discord Bot Setup using Discord.js v14
const { Client, GatewayIntentBits, Partials, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Bot configuration
const config = {
  prefix: '&',
  ownerId: '1322194935528689787', // Owner can assign premium status to users
  premiumUsers: [] // Array of user IDs with premium access (no prefix required)
};

// Create client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

// Collections for commands and features
client.commands = new Collection();
client.aliases = new Collection();
client.premiumUsers = new Collection();

// Load commands
const loadCommands = (dir) => {
  const commandFolders = fs.readdirSync(dir);
  
  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`${dir}/${folder}`).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(`${dir}/${folder}/${file}`);
      
      // Set command in collection
      client.commands.set(command.name, command);
      
      // Set aliases if any
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => client.aliases.set(alias, command.name));
      }
      
      console.log(`Loaded command: ${command.name}`);
    }
  }
};

// Message handler
client.on(Events.MessageCreate, async message => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if user is premium (no prefix needed) or if prefix is used
  let args;
  let commandName;
  let isPremium = config.premiumUsers.includes(message.author.id);
  
  // Handle commands with prefix
  if (message.content.startsWith(config.prefix)) {
    args = message.content.slice(config.prefix.length).trim().split(/ +/);
    commandName = args.shift().toLowerCase();
  } 
  // Handle commands without prefix for premium users
  else if (isPremium) {
    args = message.content.trim().split(/ +/);
    commandName = args.shift().toLowerCase();
  } 
  // Not a command
  else {
    return;
  }
  
  // Check if command exists
  const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
  if (!command) return;
  
  // Check permissions
  if (command.ownerOnly && message.author.id !== config.ownerId) {
    return message.reply('Only the bot owner can use this command.');
  }
  
  // Check if premium-only command
  if (command.premiumOnly && !isPremium) {
    return message.reply('This command is only available to premium users.');
  }
  
  // Execute command
  try {
    command.execute(client, message, args);
  } catch (error) {
    console.error(error);
    message.reply('There was an error executing that command!');
  }
});

// Premium user management (owner only)
client.on(Events.MessageCreate, async message => {
  if (message.author.id !== config.ownerId) return;
  
  if (message.content.startsWith(`${config.prefix}addpremium`)) {
    const args = message.content.slice(config.prefix.length + 'addpremium'.length).trim().split(/ +/);
    const userId = args[0];
    
    if (!userId) return message.reply('Please provide a user ID.');
    
    if (!config.premiumUsers.includes(userId)) {
      config.premiumUsers.push(userId);
      message.reply(`User ${userId} has been added to premium users.`);
    } else {
      message.reply('This user is already a premium user.');
    }
  }
  
  if (message.content.startsWith(`${config.prefix}removepremium`)) {
    const args = message.content.slice(config.prefix.length + 'removepremium'.length).trim().split(/ +/);
    const userId = args[0];
    
    if (!userId) return message.reply('Please provide a user ID.');
    
    const index = config.premiumUsers.indexOf(userId);
    if (index > -1) {
      config.premiumUsers.splice(index, 1);
      message.reply(`User ${userId} has been removed from premium users.`);
    } else {
      message.reply('This user is not a premium user.');
    }
  }
});

// Ready event
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('&help | Protecting servers');
});

// Log in to Discord with your bot token
client.login(process.env.TOKEN);

// Export client for other files
module.exports = client;