// commands/games/tictactoe.js
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: 'tictactoe',
  description: 'Play a game of Tic Tac Toe with another user',
  aliases: ['ttt'],
  usage: '&tictactoe <@user>',
  category: 'games',
  
  async execute(client, message, args) {
    // Check if opponent is mentioned
    const opponent = message.mentions.users.first();
    
    if (!opponent) {
      return message.reply('Please mention a user to play with!');
    }
    
    // Check if opponent is not a bot or self
    if (opponent.bot) {
      return message.reply('You cannot play against a bot!');
    }
    
    if (opponent.id === message.author.id) {
      return message.reply('You cannot play against yourself!');
    }
    
    // Create a new game instance
    const game = {
      players: [message.author.id, opponent.id],
      currentPlayer: 0, // Index of current player in players array
      board: [
        [null, null, null],
        [null, null, null],
        [null, null, null]
      ],
      gameOver: false,
      winner: null,
      message: null
    };
    
    // Store the game in a collection
    if (!client.games) client.games = new Collection();
    const gameId = `ttt-${message.author.id}-${opponent.id}-${Date.now()}`;
    client.games.set(gameId, game);
    
    // Send game invitation
    const inviteEmbed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('Tic Tac Toe Challenge')
      .setDescription(`${message.author} has challenged ${opponent} to a game of Tic Tac Toe!`)
      .addFields(
        { name: 'Player X', value: `${message.author}`, inline: true },
        { name: 'Player O', value: `${opponent}`, inline: true }
      );
      
    const acceptButton = new ButtonBuilder()
      .setCustomId(`ttt-accept-${gameId}`)
      .setLabel('Accept Challenge')
      .setStyle(ButtonStyle.Success);
      
    const declineButton = new ButtonBuilder()
      .setCustomId(`ttt-decline-${gameId}`)
      .setLabel('Decline Challenge')
      .setStyle(ButtonStyle.Danger);
      
    const actionRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);
    
    const inviteMessage = await message.reply({
      embeds: [inviteEmbed],
      components: [actionRow]
    });
    
    // Create a filter for the collector
    const filter = i => {
      return i.user.id === opponent.id && 
        (i.customId === `ttt-accept-${gameId}` || i.customId === `ttt-decline-${gameId}`);
    };
    
    // Create collector for response
    const collector = inviteMessage.createMessageComponentCollector({ 
      filter, 
      time: 60000 // 1 minute to respond
    });
    
    collector.on('collect', async i => {
      if (i.customId === `ttt-accept-${gameId}`) {
        // Start the game
        await i.update({ 
          content: 'Game starting...', 
          embeds: [], 
          components: [] 
        });
        
        // Create and send game board
        await startGame(client, message.channel, gameId);
      } else {
        // Decline the game
        await i.update({ 
          content: `${opponent} declined the Tic Tac Toe challenge.`, 
          embeds: [], 
          components: [] 
        });
        
        // Delete the game
        client.games.delete(gameId);
      }
      
      collector.stop();
    });
    
    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        inviteMessage.edit({ 
          content: `${opponent} did not respond to the Tic Tac Toe challenge.`, 
          embeds: [], 
          components: [] 
        });
        
        // Delete the game
        client.games.delete(gameId);
      }
    });
  }
};

// Function to start the game and create the game board
async function startGame(client, channel, gameId) {
  const game = client.games.get(gameId);
  if (!game) return;
  
  // Create the game board
  const gameMessage = await createGameBoard(client, channel, gameId);
  game.message = gameMessage;
  
  // Set up collector for game moves
  const filter = i => {
    return game.players.includes(i.user.id) && 
      i.customId.startsWith(`ttt-button-${gameId}`);
  };
  
  const collector = gameMessage.createMessageComponentCollector({ filter });
  
  collector.on('collect', async i => {
    // Check if it's this player's turn
    if (i.user.id !== game.players[game.currentPlayer]) {
      return i.reply({ 
        content: "It's not your turn!", 
        ephemeral: true 
      });
    }
    
    // Get the cell position
    const position = i.customId.split('-')[3]; // Format: ttt-button-gameId-position
    const row = Math.floor(position / 3);
    const col = position % 3;
    
    // Check if cell is already taken
    if (game.board[row][col] !== null) {
      return i.reply({ 
        content: "That cell is already taken!", 
        ephemeral: true 
      });
    }
    
    // Update the board
    game.board[row][col] = game.currentPlayer; // 0 = X, 1 = O
    
    // Check for win or draw
    checkGameState(game);
    
    // Switch player if game not over
    if (!game.gameOver) {
      game.currentPlayer = game.currentPlayer === 0 ? 1 : 0;
    }
    
    // Update the game board
    await i.update(createGameBoardContent(client, gameId));
    
    // If game over, end collector
    if (game.gameOver) {
      collector.stop();
      
      // Delete game after 1 minute
      setTimeout(() => {
        client.games.delete(gameId);
      }, 60000);
    }
  });
}

// Function to create the game board message
async function createGameBoard(client, channel, gameId) {
  const content = createGameBoardContent(client, gameId);
  return await channel.send(content);
}

// Function to create the game board content
function createGameBoardContent(client, gameId) {
  const game = client.games.get(gameId);
  
  // Create the embed
  const gameEmbed = new EmbedBuilder()
    .setColor('#00FFFF')
    .setTitle('Tic Tac Toe')
    .addFields(
      { name: 'Player X', value: `<@${game.players[0]}>`, inline: true },
      { name: 'Player O', value: `<@${game.players[1]}>`, inline: true },
      { name: 'Current Turn', value: game.gameOver ? 'Game Over' : `<@${game.players[game.currentPlayer]}>` }
    );
    
  if (game.gameOver) {
    if (game.winner !== null) {
      gameEmbed.setDescription(`Game Over! <@${game.players[game.winner]}> wins!`);
    } else {
      gameEmbed.setDescription("Game Over! It's a draw!");
    }
  }
  
  // Create the button grid
  const rows = [];
  
  for (let i = 0; i < 3; i++) {
    const actionRow = new ActionRowBuilder();
    
    for (let j = 0; j < 3; j++) {
      const position = i * 3 + j;
      const cell = game.board[i][j];
      
      const button = new ButtonBuilder()
        .setCustomId(`ttt-button-${gameId}-${position}`)
        .setStyle(
          cell === null ? ButtonStyle.Secondary : 
          cell === 0 ? ButtonStyle.Primary : ButtonStyle.Danger
        )
        .setLabel(cell === null ? ' ' : cell === 0 ? 'X' : 'O')
        .setDisabled(cell !== null || game.gameOver);
        
      actionRow.addComponents(button);
    }
    
    rows.push(actionRow);
  }
  
  return { embeds: [gameEmbed], components: rows };
}

// Function to check if the game is over
function checkGameState(game) {
  const board = game.board;
  
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (board[i][0] !== null && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
      game.gameOver = true;
      game.winner = board[i][0];
      return;
    }
  }
  
  // Check columns
  for (let j = 0; j < 3; j++) {
    if (board[0][j] !== null && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
      game.gameOver = true;
      game.winner = board[0][j];
      return;
    }
  }
  
  // Check diagonals
  if (board[0][0] !== null && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    game.gameOver = true;
    game.winner = board[0][0];
    return;
  }
  
  if (board[0][2] !== null && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    game.gameOver = true;
    game.winner = board[0][2];
    return;
  }
  
  // Check for draw (all cells filled)
  let isDraw = true;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === null) {
        isDraw = false;
        break;
      }
    }
    if (!isDraw) break;
  }
  
  if (isDraw) {
    game.gameOver = true;
    game.winner = null; // Draw
  }
}