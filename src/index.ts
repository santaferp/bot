process.on('uncaughtException', function (err) {
  console.log(err);
});

import dotenv from 'dotenv';
dotenv.config();

import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} from 'discord.js';
import { prefix } from '../config.json';
import { Command } from './types/command';
import { join } from 'path';
import { readdirSync } from 'fs';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.User,
  ],
});

const commandsA: Collection<string, Command> = new Collection();
const aliases: Collection<string, Command> = new Collection();

const commandPath = join(__dirname, 'commands');
readdirSync(commandPath).forEach((dir) => {
  const commands = readdirSync(join(commandPath, dir)).filter((file) =>
    file.endsWith('.ts')
  );

  for (const file of commands) {
    const command: Command = require(`${commandPath}/${dir}/${file}`).command;
    commandsA.set(command.name, command);

    if (command.aliases && command.aliases.length > 0) {
      for (const alias of command.aliases) {
        aliases.set(alias, command);
      }
    }
  }
});

client.once('ready', () => {
  console.log('Ready!');
  client.user?.setActivity({
    name: `${prefix}help | www.santaferoleplay.tk`,
    type: ActivityType.Competing,
  });
});

client.on('messageCreate', (message) => {
  if (
    message.author.bot ||
    !message.guild ||
    !message.content.startsWith(prefix)
  )
    return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);

  const cmd = args.shift()?.toLowerCase();
  if (!cmd) return;
  const command = commandsA.get(cmd) || aliases.get(cmd);
  if (command) (command as Command).execute(client, message, args);
});

client.login(process.env.DISCORD_BOT_TOKEN);
