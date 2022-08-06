import { Command } from '../../types/command';
import { MongoClient } from 'mongodb';
import { Whitelist } from '../../types/whitelist';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Interaction,
  Message,
} from 'discord.js';

export const command: Command = {
  name: 'whitelist',
  description: 'Whitelist a user from using the bot.',
  aliases: ['wl'],
  execute: async (client, message, args) => {
    let actualPage = 1;
    let actualFilter: 'approved' | 'waiting' | 'userId' | 'robloxUser' =
      'waiting';

    const changePage = async (
      message: Message,
      page: 'main' | 'whitelists' | 'statistics',
      whitelists: Whitelist[],
      filter?: 'approved' | 'waiting' | 'userId' | 'robloxUser'
    ) => {
      if (page === 'main') {
        const mainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('whitelists')
            .setLabel('Whitelists')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('statistics')
            .setLabel('Statistics')
            .setStyle(ButtonStyle.Primary)
        );

        await message.edit({
          content: `Found ${whitelists.length} whitelists.\n\nSelect an option.`,
          components: [mainRow],
        });
        return;
      }

      if (page === 'statistics') {
        const statisticsRow =
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('main')
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
          );

        await message.edit({
          content: `Whitelists: **${whitelists.length}**\nApproved: **${
            whitelists.filter((wl) => wl.approved).length
          }**(**${Math.round(
            (whitelists.filter((wl) => wl.approved).length /
              whitelists.length) *
              100
          )}%**)\nNot approved: **${
            whitelists.filter((wl) => !wl.approved).length
          }**(**${Math.round(
            (whitelists.filter((wl) => !wl.approved).length /
              whitelists.length) *
              100
          )}%**)`,
          components: [statisticsRow],
        });
        return;
      }
      if (page === 'whitelists') {
        const whitelistPerPage = 10;
        if (!filter || filter === 'waiting') {
          const pages = [];
          for (
            let i = 0;
            i < Math.ceil(whitelists.length / whitelistPerPage);
            i++
          ) {
            pages.push(
              whitelists
                .filter((wl) => !wl.approved)
                .slice(i * whitelistPerPage, (i + 1) * whitelistPerPage)
            );
          }
          const waitingRow = new ActionRowBuilder<ButtonBuilder>();
          waitingRow.addComponents(
            new ButtonBuilder()
              .setCustomId('main')
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
          );
          if (actualPage > 1) {
            waitingRow.addComponents(
              new ButtonBuilder()
                .setCustomId('backPageList')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Primary)
            );
          }
          if (actualPage < pages.length) {
            waitingRow.addComponents(
              new ButtonBuilder()
                .setCustomId('nextPageList')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Primary)
            );
          }

          const messageContent = `Showing **${whitelistPerPage}** of **${
            whitelists.filter((wl) => !wl.approved).length
          }** whitelists.\nPage **${actualPage}** of **${
            pages.length
          }**.\n\n${pages[actualPage - 1]
            .map(
              (wl) =>
                `**${wl.robloxUser}** - <@${wl.discordUserId}>(${wl.discordUserId})`
            )
            .join('\n')}`;

          await message.edit({
            content: messageContent,
            components: [waitingRow],
          });
          return;
        }
        return;
      }
    };

    const msg = await message.channel.send('Processing...');
    const mongoClient = await MongoClient.connect(
      process.env.MONGO_URI as string
    );

    const admins_db = mongoClient.db('admins');
    const admins_collection = admins_db.collection('admins');

    const user = await admins_collection.findOne({
      discordUserId: message.author.id,
    });

    if (!user) {
      await msg.edit('You are not an admin.');
      return;
    }

    const whitelist_db = mongoClient.db('whitelist');
    const whitelist_collection = whitelist_db.collection('users');

    await msg.edit('Getting whitelists...');

    const whitelists = (await whitelist_collection
      .find({})
      .toArray()) as Whitelist[];

    await mongoClient.close();

    await changePage(msg, 'main', whitelists);

    const filter = (i: Interaction) => {
      return i.user.id === message.author.id;
    };

    const collector = message.channel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: filter,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'main') {
        await interaction.deferUpdate();
        await changePage(msg, 'main', whitelists);
        return;
      }
      if (interaction.customId === 'statistics') {
        await interaction.deferUpdate();
        await changePage(msg, 'statistics', whitelists);
        return;
      }
      if (interaction.customId === 'whitelists') {
        await interaction.deferUpdate();
        await changePage(msg, 'whitelists', whitelists);
        return;
      }
      if (interaction.customId === 'backPageList') {
        await interaction.deferUpdate();
        actualPage--;
        await changePage(msg, 'whitelists', whitelists, actualFilter);
        return;
      }
      if (interaction.customId === 'nextPageList') {
        await interaction.deferUpdate();
        actualPage++;
        await changePage(msg, 'whitelists', whitelists, actualFilter);
        return;
      }
    });
  },
};
