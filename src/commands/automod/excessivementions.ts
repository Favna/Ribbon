/**
 * @file Automod ExcessiveMentionsCommand - Toggle the excessive mentions filter
 *
 * **Aliases**: `emf`, `mfilter`,  `spammedmentions`, `manymentions`
 * @module
 * @category automod
 * @name excessivementions
 * @example excessivementions enable
 * @example emf enable 3
 * @param {boolean} Option True or False
 * @param {string} [threshold] How many mentions allowed in 1 message
 */

import { deleteCommandMessages, modLogMessage, startTyping, stopTyping, validateBool } from '@components/Utils';
import { Command, CommandoClient, CommandoMessage } from 'awesome-commando';
import { MessageEmbed, TextChannel } from 'awesome-djs';
import { stripIndents } from 'common-tags';

export default class ExcessiveMentionsCommand extends Command {
    constructor (client: CommandoClient) {
        super(client, {
            name: 'excessivementions',
            aliases: ['emf', 'mfilter', 'spammedmentions', 'manymentions'],
            group: 'automod',
            memberName: 'excessivementions',
            description: 'Toggle the excessive mentions filter',
            format: 'boolean',
            examples: ['excessivementions enable', 'emf enable 3'],
            guildOnly: true,
            clientPermissions: ['MANAGE_MESSAGES'],
            userPermissions: ['MANAGE_MESSAGES'],
            throttling: {
                usages: 2,
                duration: 3,
            },
            args: [
                {
                    key: 'option',
                    prompt: 'Enable or disable the Excessive Emojis filter?',
                    type: 'boolean',
                    validate: (bool: boolean) => validateBool(bool),
                },
                {
                    key: 'threshold',
                    prompt: 'How many mentions are allowed in 1 message?',
                    type: 'integer',
                    default: 5,
                }
            ],
        });
    }

    public run (msg: CommandoMessage, { option, threshold }: { option: boolean; threshold: number }) {
        startTyping(msg);

        const emEmbed = new MessageEmbed();
        const modlogChannel = msg.guild.settings.get('modlogchannel', null);
        const options = { threshold, enabled: option };

        msg.guild.settings.set('mentions', options);

        emEmbed
            .setColor('#439DFF')
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(stripIndents`
                **Action:** Mentions filter has been ${option ? 'enabled' : 'disabled'}
                ${option ? `**Threshold:** Messages that have at least ${threshold} mentions will be deleted` : ''}
                ${!msg.guild.settings.get('automod', false) ? `**Notice:** Be sure to enable the general automod toggle with the \`${msg.guild.commandPrefix}automod\` command!` : ''}`
            )
            .setTimestamp();

        if (msg.guild.settings.get('modlogs', true)) {
            modLogMessage(msg, msg.guild, modlogChannel, msg.guild.channels.get(modlogChannel) as TextChannel, emEmbed);
        }

        deleteCommandMessages(msg, this.client);
        stopTyping(msg);

        return msg.embed(emEmbed);
    }
}
