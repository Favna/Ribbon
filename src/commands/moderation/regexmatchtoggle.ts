/**
 * @file Moderation RegexMatchToggleCommand - Toggle commands matching on regex for this server
 *
 * **Aliases**: `rmt`, `regexmatch`
 * @module
 * @category moderation
 * @name regexmatchtoggle
 * @example regexmatchtoggle enable
 * @param {boolean} Option True or False
 */

import { deleteCommandMessages, logModMessage, shouldHavePermission } from '@components/Utils';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { MessageEmbed, TextChannel } from 'discord.js';

interface RegexMatchToggleArgs {
  shouldEnable: boolean;
}

export default class RegexMatchToggleCommand extends Command {
  public constructor(client: CommandoClient) {
    super(client, {
      name: 'regexmatchtoggle',
      aliases: [ 'rmt', 'regexmatch' ],
      group: 'moderation',
      memberName: 'regexmatchtoggle',
      description: 'Toggle commands matching on regex for this server',
      format: 'boolean',
      examples: [ 'regexmatchtoggle enable' ],
      guildOnly: true,
      throttling: {
        usages: 2,
        duration: 3,
      },
      args: [
        {
          key: 'shouldEnable',
          prompt: 'Enable or disable regex matches?',
          type: 'validboolean',
        }
      ],
    });
  }

  @shouldHavePermission('MANAGE_MESSAGES')
  public async run(msg: CommandoMessage, { shouldEnable }: RegexMatchToggleArgs) {
    const modlogChannel = msg.guild.settings.get('modlogchannel', null);
    const regexMatchEmbed = new MessageEmbed();

    msg.guild.settings.set('regexmatches', shouldEnable);

    regexMatchEmbed
      .setColor('#3DFFE5')
      .setAuthor(msg.author!.tag, msg.author!.displayAvatarURL())
      .setDescription(`**Action:** Pattern matching commands are now ${shouldEnable ? 'enabled' : 'disabled'}`)
      .setTimestamp();

    if (msg.guild.settings.get('modlogs', true)) {
      logModMessage(
        msg, msg.guild, modlogChannel, msg.guild.channels.get(modlogChannel) as TextChannel, regexMatchEmbed
      );
    }

    deleteCommandMessages(msg, this.client);

    return msg.embed(regexMatchEmbed);
  }
}