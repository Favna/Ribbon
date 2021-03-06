/**
 * @file Moderation JoinMessagesCommand - Toggle whether Ribbon should send special greeting messages when members join
 *
 * **Aliases**: `jmt`, `joinmessagestoggle`
 * @module
 * @category moderation
 * @name joinmessages
 * @example joinmessages enable
 * @param {boolean} Option True or False
 * @param {TextChannel} [Channel] TextChannel the Join Message is sent to, required when enabling
 */

import { deleteCommandMessages, logModMessage, shouldHavePermission } from '@components/Utils';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { MessageEmbed, TextChannel } from 'discord.js';
import { oneLine, stripIndents } from 'common-tags';
import moment from 'moment';

interface JoinMessagesArgs {
  shouldEnable: boolean;
  msgChannel: TextChannel | string;
}

export default class JoinMessagesCommand extends Command {
  public constructor(client: CommandoClient) {
    super(client, {
      name: 'joinmessages',
      aliases: [ 'jmt', 'joinmessagestoggle' ],
      group: 'moderation',
      memberName: 'joinmessages',
      description: 'Toggle whether Ribbon should send special greeting messages when members join',
      format: 'boolean [Channel]',
      examples: [ 'joinmessages enable' ],
      guildOnly: true,
      throttling: {
        usages: 2,
        duration: 3,
      },
      args: [
        {
          key: 'shouldEnable',
          prompt: 'Enable or disable join messages?',
          type: 'validboolean',
        },
        {
          key: 'msgChannel',
          prompt: 'In which channel should I greet people?',
          type: 'channel',
          default: 'off',
        }
      ],
    });
  }

  @shouldHavePermission('MANAGE_MESSAGES')
  public async run(msg: CommandoMessage, { shouldEnable, msgChannel }: JoinMessagesArgs) {
    try {
      if (shouldEnable && msgChannel === 'off') {
        return msg.reply('when activating join messages you need to provide a channel for me to output the messages to!');
      }

      const description = shouldEnable
        ? '📈 Ribbon join messages have been enabled'
        : '📈 Ribbon join messages have been disabled';
      const modlogChannel = msg.guild.settings.get('modlogchannel', null);
      const joinMsgEmbed = new MessageEmbed()
        .setColor('#AAEFE6')
        .setAuthor(msg.author!.tag, msg.author!.displayAvatarURL())
        .setDescription(`**Action:** ${description}`)
        .setTimestamp();

      msg.guild.settings.set('joinmsgs', shouldEnable);

      if (this.isChannel(msgChannel)) {
        msg.guild.settings.set('joinmsgchannel', msgChannel.id);
        joinMsgEmbed.description += `\n${shouldEnable ? `**Channel:** <#${msgChannel.id}>` : ''}`;
      }

      if (msg.guild.settings.get('modlogs', true)) {
        logModMessage(
          msg, msg.guild, modlogChannel, msg.guild.channels.get(modlogChannel) as TextChannel, joinMsgEmbed
        );
      }

      deleteCommandMessages(msg, this.client);

      return msg.embed(joinMsgEmbed);
    } catch (err) {
      deleteCommandMessages(msg, this.client);
      const channel = this.client.channels.get(process.env.ISSUE_LOG_CHANNEL_ID!) as TextChannel;

      channel.send(stripIndents`
        <@${this.client.owners[0].id}> Error occurred in \`joinmessages\` command!
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

  private isChannel(channel: TextChannel | string): channel is TextChannel {
    return (channel as TextChannel).id !== undefined;
  }
}