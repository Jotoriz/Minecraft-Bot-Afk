const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Bots Are Ready');
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// Function to create a bot
function createBot(account) {
  const bot = mineflayer.createBot({
    username: account.username,
    password: account.password,
    auth: account.type || 'mojang', // Default to mojang if type is not specified
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version,
  });

  bot.loadPlugin(pathfinder);
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.settings.colorsEnabled = false;

  bot.once('spawn', () => {
    console.log(`\x1b[33m[BotLog] Bot ${account.username} joined the server\x1b[0m`);

    if (config.utils['auto-auth'].enabled) {
      console.log(`[INFO] Bot ${account.username} started auto-auth module`);

      const password = config.utils['auto-auth'].password;
      setTimeout(() => {
        bot.chat(`/register ${password} ${password}`);
        bot.chat(`/login ${password}`);
      }, 500);

      console.log(`[Auth] Bot ${account.username} authentication commands executed.`);
    }

    if (config.utils['chat-messages'].enabled) {
      console.log(`[INFO] Bot ${account.username} started chat-messages module`);
      const messages = config.utils['chat-messages']['messages'];

      if (config.utils['chat-messages'].repeat) {
        const delay = config.utils['chat-messages']['repeat-delay'];
        let i = 0;

        setInterval(() => {
          bot.chat(`${messages[i]}`);

          i = (i + 1) % messages.length; // Cycle through messages
        }, delay * 1000);
      } else {
        messages.forEach((msg) => {
          bot.chat(msg);
        });
      }
    }

    const pos = config.position;

    if (config.position.enabled) {
      console.log(`\x1b[32m[BotLog] Bot ${account.username} starting to move to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
    }

    if (config.utils['anti-afk'].enabled) {
      bot.setControlState('jump', true);
      if (config.utils['anti-afk'].sneak) {
        bot.setControlState('sneak', true);
      }
    }
  });

  bot.on('chat', (username, message) => {
    if (config.utils['chat-log']) {
      console.log(`[ChatLog] Bot ${account.username} <${username}> ${message}`);
    }
  });

  bot.on('goal_reached', () => {
    console.log(`\x1b[32m[BotLog] Bot ${account.username} arrived at target location. ${bot.entity.position}\x1b[0m`);
  });

  bot.on('death', () => {
    console.log(`\x1b[33m[BotLog] Bot ${account.username} has died and was respawned. Position: ${bot.entity.position}\x1b[0m`);
  });

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      setTimeout(() => {
        createBot(account);
      }, config.utils['auto-recconect-delay']);
    });
  }

  bot.on('kicked', (reason) =>
    console.log(`\x1b[33m[BotLog] Bot ${account.username} was kicked from the server. Reason: \n${reason}\x1b[0m`)
  );
  
  bot.on('error', (err) =>
    console.log(`\x1b[31m[ERROR] Bot ${account.username}: ${err.message}\x1b[0m`)
  );
}

// Create a bot for each account in the configuration
config['bot-account'].forEach(account => {
  createBot(account);
});
