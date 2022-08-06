import { Client, Message } from 'discord.js';

interface Execute {
  (client: Client, message: Message, args: string[]): void;
}

export declare interface Command {
  name: string;
  description?: string;
  aliases?: string[];
  execute: Execute;
}
