/**
 * @file Automod ExternalLinksCommand - Toggle the external links filter
 *
 * **Aliases**: `extlinks`, `extlinksfilter`, `elf`
 * @module
 * @category automod
 * @name externallinks
 * @example externallinks enable
 * @param {boolean} Option True or False
 */

import { deleteCommandMessages, logModMessage, shouldHavePermission } from '@components/Utils';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { MessageEmbed, TextChannel } from 'discord.js';
import { stripIndents } from 'common-tags';

interface ExternalLinksArgs {
  shouldEnable: boolean;
}

export default class ExternalLinksCommand extends Command {
  public constructor(client: CommandoClient) {
    super(client, {
      name: 'externallinks',
      aliases: [ 'extlinks', 'extlinksfilter', 'elf' ],
      group: 'automod',
      memberName: 'externallinks',
      description: 'Toggle the external links filter',
      format: 'boolean',
      examples: [ 'externallinks enable' ],
      guildOnly: true,
      throttling: {
        usages: 2,
        duration: 3,
      },
      args: [
        {
          key: 'shouldEnable',
          prompt: 'Enable or disable the external links filter?',
          type: 'validboolean',
        }
      ],
    });
  }

  @shouldHavePermission('MANAGE_MESSAGES', true)
  public async run(msg: CommandoMessage, { shouldEnable }: ExternalLinksArgs) {
    const elEmbed = new MessageEmbed();
    const modlogChannel = msg.guild.settings.get('modlogchannel', null);

    msg.guild.settings.set('links', shouldEnable);

    elEmbed
      .setColor('#439DFF')
      .setAuthor(msg.author!.tag, msg.author!.displayAvatarURL())
      .setDescription(stripIndents`
        **Action:** external links filter has been ${shouldEnable ? 'enabled' : 'disabled'}
        ${msg.guild.settings.get('automod', false) ? '' : `**Notice:** Be sure to enable the general automod toggle with the \`${msg.guild.commandPrefix}automod\` command!`}`)
      .setTimestamp();

    if (msg.guild.settings.get('modlogs', true)) {
      logModMessage(
        msg, msg.guild, modlogChannel, msg.guild.channels.get(modlogChannel) as TextChannel, elEmbed
      );
    }

    deleteCommandMessages(msg, this.client);

    return msg.embed(elEmbed);
  }
}