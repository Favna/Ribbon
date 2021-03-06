/**
 * @file Moderation WarnCommand - Gives a member warning points
 *
 * Please note that Ribbon will not auto ban when the member has a certain amount of points!
 *
 * **Aliases**: `warning`
 * @module
 * @category moderation
 * @name warn
 * @example warn Biscuit 5 Not giving everyone cookies
 * @param {GuildMemberResolvable} AnyMember The member to give warning points
 * @param {number} WarningPoints The amount of warning points to give
 * @param {string} TheReason Reason for warning
 */

import { deleteCommandMessages, logModMessage, shouldHavePermission } from '@components/Utils';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { GuildMember, MessageEmbed, TextChannel } from 'discord.js';
import { oneLine, stripIndents } from 'common-tags';
import moment from 'moment';
import { readWarning, updateWarning } from '@components/Typeorm/DbInteractions';

interface WarnArgs {
  member: GuildMember;
  points: number;
  reason: string;
}

export default class WarnCommand extends Command {
  public constructor(client: CommandoClient) {
    super(client, {
      name: 'warn',
      aliases: [ 'warning' ],
      group: 'moderation',
      memberName: 'warn',
      description: 'Warn a member with a specified amount of points',
      format: 'MemberID|MemberName(partial or full) AmountOfWarnPoints ReasonForWarning',
      examples: [ 'warn JohnDoe 1 annoying' ],
      guildOnly: true,
      throttling: {
        usages: 2,
        duration: 3,
      },
      args: [
        {
          key: 'member',
          prompt: 'Which member should I give a warning?',
          type: 'member',
        },
        {
          key: 'points',
          prompt: 'How many warning points should I give this member?',
          type: 'integer',
        },
        {
          key: 'reason',
          prompt: 'What is the reason for this warning?',
          type: 'string',
          default: '',
        }
      ],
    });
  }

  @shouldHavePermission('MANAGE_MESSAGES')
  public async run(msg: CommandoMessage, { member, points, reason }: WarnArgs) {
    const modlogChannel = msg.guild.settings.get('modlogchannel', null);
    const warnEmbed = new MessageEmbed()
      .setColor('#FFFF00')
      .setAuthor(msg.author!.tag, msg.author!.displayAvatarURL())
      .setTimestamp();

    try {
      const warning = await readWarning(member.id, msg.guild.id);
      let newPoints = points;
      let previousPoints = 0;

      if (warning && warning.points !== undefined) {
        previousPoints = warning.points;
        newPoints += warning.points;
      }

      await updateWarning({
        userId: member.id,
        guildId: msg.author!.id,
        tag: member.user.tag,
        points: newPoints,
      });

      warnEmbed.setDescription(stripIndents`
        **Member:** ${member.user.tag} (${member.id})
        **Action:** Warn
        **Previous Warning Points:** ${previousPoints}
        **Current Warning Points:** ${newPoints}
        **Reason:** ${reason !== '' ? reason : 'No reason has been added by the moderator'}`
      );

      if (msg.guild.settings.get('modlogs', true)) {
        logModMessage(
          msg, msg.guild, modlogChannel, msg.guild.channels.get(modlogChannel) as TextChannel, warnEmbed
        );
      }

      deleteCommandMessages(msg, this.client);

      return msg.embed(warnEmbed);
    } catch (err) {
      const channel = this.client.channels.get(process.env.ISSUE_LOG_CHANNEL_ID!) as TextChannel;

      channel.send(stripIndents`
          <@${this.client.owners[0].id}> Error occurred in \`warn\` command!
          **Server:** ${msg.guild.name} (${msg.guild.id})
          **Author:** ${msg.author!.tag} (${msg.author!.id})
          **Time:** ${moment(msg.createdTimestamp).format('MMMM Do YYYY [at] HH:mm:ss [UTC]Z')}
          **Input:** \`${member.user.tag} (${member.id})\`|| \`${points}\` || \`${reason}\`
          **Error Message:** ${err}`
      );

      return msg.reply(oneLine`
          an unknown and unhandled error occurred but I notified ${this.client.owners[0].username}.
          Want to know more about the error?
          Join the support server by getting an invite by using the \`${msg.guild.commandPrefix}invite\` command`
      );
    }
  }
}