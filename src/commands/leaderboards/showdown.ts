/**
 * @file Leaderboards ShowdownCommand - Show the top ranking players in your tier of choice
 *
 * **Aliases**: `showdownlb`, `pokelb`
 * @module
 * @category leaderboards
 * @name showdown
 * @example showdown ou
 * @param {string} TierName Name of the tier to view the leaderboard for
 */

import { ASSET_BASE_PATH, DEFAULT_EMBED_COLOR } from '@components/Constants';
import { deleteCommandMessages, roundNumber } from '@components/Utils';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { MessageEmbed, TextChannel } from 'discord.js';
import { oneLine, stripIndents } from 'common-tags';
import moment from 'moment';
import fetch from 'node-fetch';
import { ShowdownData } from 'RibbonTypes';

interface ShowdownArgs {
  tier: string;
}

export default class ShowdownCommand extends Command {
  public constructor(client: CommandoClient) {
    super(client, {
      name: 'showdown',
      aliases: [ 'showdownlb', 'pokelb' ],
      group: 'leaderboards',
      memberName: 'showdown',
      description: 'Show the top ranking players in your tier of choice',
      format: 'TierName',
      examples: [ 'showdown ou' ],
      guildOnly: false,
      throttling: {
        usages: 2,
        duration: 3,
      },
      args: [
        {
          key: 'tier',
          prompt: 'Respond with the Showdown tier',
          type: 'sdtier',
        }
      ],
    });
  }

  public async run(msg: CommandoMessage, { tier }: ShowdownArgs) {
    try {
      const ladders = await fetch(`https://pokemonshowdown.com/ladder/${tier}.json`);
      const json: ShowdownData = await ladders.json();
      const data = {
        elo: json.toplist.map(e => roundNumber(e.elo)).slice(0, 10),
        losses: json.toplist.map(l => l.l).slice(0, 10),
        usernames: json.toplist.map(u => u.username).slice(0, 10),
        wins: json.toplist.map(w => w.w).slice(0, 10),
      };
      const showdownEmbed = new MessageEmbed();

      showdownEmbed
        .setColor(msg.guild ? msg.guild.me!.displayHexColor : DEFAULT_EMBED_COLOR)
        .setThumbnail(`${ASSET_BASE_PATH}/ribbon/showdown.png`)
        .setTitle(`Pokemon Showdown ${tier} Leaderboard`);

      data.usernames.forEach((username, index) => {
        showdownEmbed.addField(
          `${index + 1}: ${username}`,
          stripIndents`
            **Wins**:${data.wins[index]}
            **Losses**:${data.losses[index]}
            **ELO**:${data.elo[index]}`,
          true
        );
      });

      deleteCommandMessages(msg, this.client);

      return msg.embed(showdownEmbed);
    } catch (err) {
      deleteCommandMessages(msg, this.client);

      const channel = this.client.channels.get(process.env.ISSUE_LOG_CHANNEL_ID!) as TextChannel;

      channel.send(stripIndents`
        <@${this.client.owners[0].id}> Error occurred in \`coin\` command!
        **Server:** ${msg.guild.name} (${msg.guild.id})
        **Author:** ${msg.author!.tag} (${msg.author!.id})
        **Time:** ${moment(msg.createdTimestamp).format('MMMM Do YYYY [at] HH:mm:ss [UTC]Z')}
        **Error Message:** ${err}`);

      return msg.reply(oneLine`
        an unknown and unhandled error occurred but I notified ${this.client.owners[0].username}.
        Want to know more about the error?
        Join the support server by getting an invite by using the \`${msg.guild.commandPrefix}invite\` command`);
    }
  }
}