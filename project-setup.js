# Discord Bot Setup Guide

## Prerequisites
- Node.js (v16.9.0 or higher)
- npm (Node Package Manager)
- A Discord account and developer access

## Step 1: Create Discord Application and Bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name your bot
3. Navigate to the "Bot" tab and click "Add Bot"
4. Under the "Privileged Gateway Intents" section, enable:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
5. Copy your bot token (you'll need this later)

## Step 2: Create Project Structure
1. Create a new folder for your bot
2. Inside this folder, create:
   - `index.js` (main bot file)
   - `commands/` folder with subfolders for each category
   - `events/` folder for event handlers
   - `.env` file for your token and other secrets

## Step 3: Install Required Packages
Open a terminal in your project folder and run:

```bash
npm init -y
npm install discord.js dotenv fs path
```

For music functionality:
```bash
npm install discord-player @discord-player/extractor 
```

For giveaways:
```bash
npm install discord-giveaways
```

## Step 4: Set Up Environment Variables
Create a `.env` file in your project root with:

```
TOKEN=your_bot_token_here
```

## Step 5: Create Events Structure
Create essential event files in the `events/` folder to handle various Discord events.

## Step 6: Invite Your Bot
1. Go to the Discord Developer Portal
2. Navigate to your application's "OAuth2" tab
3. In the URL Generator, select "bot" and "applications.commands" scopes
4. Select the necessary permissions (Administrator for full access)
5. Copy the generated URL and paste it in your browser
6. Select the server to invite your bot to

## Step 7: Run Your Bot
In your terminal, run:

```bash
node index.js
```

## Step 8: Add More Commands
Follow the example command structures to add more commands for each feature category.

## Deployment Options
For 24/7 uptime, consider hosting your bot on:
- [Railway](https://railway.app/)
- [Heroku](https://www.heroku.com/)
- [Replit](https://replit.com/)
- A VPS like [DigitalOcean](https://www.digitalocean.com
