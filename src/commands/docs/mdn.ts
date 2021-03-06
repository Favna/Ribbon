/**
 * @file Docs MDNCommand - Responds with JS documentation pulled from Mozilla Developer Network
 *
 * **Aliases**: `mozilla`, `moz`
 * @module
 * @category docs
 * @name mdn
 * @example mdn map
 * @param {string} prop The property or prototype to find on MDN
 */

import { ASSET_BASE_PATH } from '@components/Constants';
import { deleteCommandMessages } from '@components/Utils';
import { stringify } from '@favware/querystring';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { MessageEmbed, TextChannel } from 'discord.js';
import { oneLine, stripIndents } from 'common-tags';
import moment from 'moment';
import fetch from 'node-fetch';
import Turndown from 'turndown';

interface MDNArgs {
  prop: string;
}

export default class MDNCommand extends Command {
  public constructor(client: CommandoClient) {
    super(client, {
      name: 'mdn',
      aliases: [ 'mozilla' ],
      group: 'docs',
      memberName: 'mdn',
      description: 'Responds with JS documentation pulled from Mozilla Developer Network',
      format: 'js_property',
      examples: [ 'Map', 'Map#get', 'Array' ],
      guildOnly: false,
      throttling: {
        usages: 2,
        duration: 3,
      },
      args: [
        {
          key: 'prop',
          prompt: 'What would you like to search MDN for?',
          type: 'string',
          parse: (prop: string) => prop.replace(/\.([A-z]+)\(\)/g, '#$1').replace(/#/g, '.prototype.'),
        }
      ],
    });
  }

  public async run(msg: CommandoMessage, { prop }: MDNArgs) {
    try {
      const res = await fetch(`https://mdn.pleb.xyz/search?${stringify({ q: prop })}`);
      const body = await res.json();
      if (!body.URL || !body.Title || !body.Summary) throw new Error('no_content');

      const turndown = new Turndown();
      turndown.addRule('hyperlink', {
        filter: 'a',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        replacement: (text: string, node: any) => `[${text}](https://developer.mozilla.org${node.href})`,
      });
      const summary = body.Summary.replace(/<code><strong>(.+)<\/strong><\/code>/g, '<strong><code>$1</code></strong>');
      const mdnEmbed = new MessageEmbed()
        .setColor('#066FAD')
        .setAuthor('MDN', `${ASSET_BASE_PATH}/ribbon/mdn.png`, 'https://developer.mozilla.org/')
        .setURL(`https://developer.mozilla.org${body.URL}`)
        .setTitle(body.Title)
        .setDescription(turndown.turndown(summary));

      return msg.embed(mdnEmbed);
    } catch (err) {
      deleteCommandMessages(msg, this.client);

      if (/(?:no_data_found)/i.test(err.toString())) {
        return msg.reply(oneLine`
          I couldn't find any data for \`${prop}\` in the MDN Docs.
          Maybe try searching something that actually exists next time?`);
      }

      const channel = this.client.channels.get(process.env.ISSUE_LOG_CHANNEL_ID!) as TextChannel;

      channel.send(stripIndents`
        <@${this.client.owners[0].id}> Error occurred in \`mdn\` command!
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