/**
 * @file Info ActivityCommand - Gets the activity (presence) data from a member
 *
 * **Aliases**: `act`, `presence`, `richpresence`
 * @module
 * @category info
 * @name activity
 * @example activity Favna
 * @param {GuildMemberResolvable} member Member to get the activity for
 */

import { stringify } from 'awesome-querystring';
import { oneLine, stripIndents } from 'common-tags';
import { GuildMember, MessageEmbed, TextChannel } from 'discord.js';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import moment from 'moment';
import 'moment-duration-format';
import fetch from 'node-fetch';
import { currencyMap, DEFAULT_EMBED_COLOR, deleteCommandMessages, IDiscordGameParsed, IDiscordGameSku, IDiscordStoreGameData, startTyping, stopTyping } from '../../components';

export default class ActivityCommand extends Command {
    constructor (client: CommandoClient) {
        super(client, {
            name: 'activity',
            aliases: ['act', 'presence', 'richpresence'],
            group: 'info',
            memberName: 'activity',
            description: 'Gets the activity (presence) data from a member',
            format: 'MemberID|MemberName(partial or full)',
            examples: ['activity Favna'],
            guildOnly: true,
            throttling: {
                usages: 2,
                duration: 3,
            },
            args: [
                {
                    key: 'member',
                    prompt:
                        'What user would you like to get the activity from?',
                    type: 'member',
                }
            ],
        });
    }

    /* tslint:disable: cyclomatic-complexity*/
    public async run (msg: CommandoMessage, { member }: { member: GuildMember }) {
        try {
            startTyping(msg);
            const activity = member.presence.activity;
            const ava = member.user.displayAvatarURL();
            const embed = new MessageEmbed();
            const ext = this.fetchExt(ava);
            const isSpotifyMusic = activity.type === 'LISTENING' && activity.name === 'Spotify';
            const games = await fetch('https://canary.discordapp.com/api/v6/applications/detectable');
            const gameList = await games.json();

            let isDiscordStoreGame: boolean = false;
            let discordGameData: IDiscordGameParsed = { id: '', icon: '' };

            for (const game of gameList) {
                if (game.name === activity.name) {
                    discordGameData = { id: game.id, icon: game.icon };

                    const skuId = game.distributor_applications.filter((y: IDiscordGameSku) => y.distributor === 'discord')[0].sku;

                    const storeCheck = await fetch(`https://canary.discordapp.com/api/v6/store/published-listings/skus/${skuId}`);
                    const storeData: IDiscordStoreGameData = await storeCheck.json();

                    isDiscordStoreGame = !storeData.code;

                    if (isDiscordStoreGame) {
                        discordGameData = {
                            id: game.id,
                            icon: game.icon,
                            name: storeData.sku.name,
                            store_link: `https://discordapp.com/store/skus/${skuId}`,
                            developers: game.developers,
                            publishers: game.publishers,
                            summary: storeData.summary,
                            price: `${currencyMap(storeData.sku.price.currency)}${String(storeData.sku.price.amount).slice(0, 2)}.${String(storeData.sku.price.amount).slice(2)}`,
                            thumbnail: `https://cdn.discordapp.com/app-assets/${game.id}/store/${storeData.thumbnail.id}.png?${stringify({ size: 1024 })}`,
                        };
                    }
                }
            }

            let spotifyData: any = {};

            embed
                .setColor(msg.guild ? msg.guild.me.displayHexColor : DEFAULT_EMBED_COLOR)
                .setAuthor(member.user.tag, ava, `${ava}?size2048`)
                .setThumbnail(ext.includes('gif') ? `${ava}&f=.gif` : ava);

            if (!activity) throw new Error('noActivity');
            if (isSpotifyMusic) {
                const tokenReq = await fetch(
                    'https://accounts.spotify.com/api/token',
                    {
                        body: stringify({ grant_type: 'client_credentials' }),
                        headers: {
                            Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_ID}:${process.env.SPOTIFY_SECRET}`).toString('base64')}`,
                            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                        },
                        method: 'POST',
                    }
                );
                const tokenRes = await tokenReq.json();
                const trackSearch = await fetch(
                    `https://api.spotify.com/v1/search?${stringify({
                        limit: '1',
                        q: activity.details,
                        type: 'track',
                    })}`,
                    {
                        headers: { Authorization: `Bearer ${tokenRes.access_token}` },
                        method: 'GET',
                    }
                );
                const songInfo = await trackSearch.json();
                spotifyData = songInfo.tracks.items[0];
            }

            if (!isDiscordStoreGame) {
                embed.addField(this.convertType(activity.type), activity.name, true);
            }

            if (activity.url) {
                embed.addField('URL', `[${activity.url.slice(8)}](${activity.url})`, true);
            }

            if (activity.details) {
                if (isSpotifyMusic) {
                    embed.addField('Track', `[${activity.details}](${spotifyData.external_urls.spotify})`, true);
                } else {
                    embed.addField('Details', activity.details, true);
                }
            }

            if (activity.state) {
                if (isSpotifyMusic) {
                    embed.addField('Artist(s)', `${spotifyData.artists.map((artist: any) => `${artist.name}`).join(', ')}`, true);
                } else {
                    embed.addField('State', activity.state, true);
                }
            }

            if (activity.party && activity.party.size) {
                embed.addField(
                    'Party Size',
                    `${activity.party.size[0]} of ${activity.party.size[1]}`,
                    true
                );
            }

            if (activity.assets) {
                embed.setThumbnail(
                    !activity.assets.largeImage.includes('spotify')
                        ? `https://cdn.discordapp.com/app-assets/${
                            activity.applicationID
                            }/${activity.assets.largeImage}.png`
                        : `https://i.scdn.co/image/${
                            activity.assets.largeImage.split(':')[1]
                            }`
                );
            }

            if (activity.timestamps && activity.timestamps.start) {
                embed
                    .setFooter('Start Time')
                    .setTimestamp(activity.timestamps.start);
                if (activity.timestamps.end) {
                    embed.addField(
                        'End Time',
                        `${moment.duration(moment(activity.timestamps.end).diff(Date.now())).format('H [hours], m [minutes] [and] s [seconds]')}`,
                        true
                    );
                }
            }

            if (activity.assets && activity.assets.smallImage) {
                embed.setFooter(
                    activity.assets.smallText
                        ? activity.timestamps && activity.timestamps.start
                        ? `${activity.assets.smallText} | Start Time`
                        : activity.assets.smallText
                        : activity.timestamps && activity.timestamps.start
                        ? 'Start Time'
                        : '​',
                    !activity.assets.smallImage.includes('spotify')
                        ? `https://cdn.discordapp.com/app-assets/${activity.applicationID}/${activity.assets.smallImage}.png`
                        : `https://i.scdn.co/image/${activity.assets.smallImage.split(':')[1]}`
                );
            }

            if (activity.assets && activity.assets.largeText) {
                if (isSpotifyMusic) {
                    embed.addField(
                        'Album',
                        `[${activity.assets.largeText}](${spotifyData.album.external_urls.spotify})`,
                        true
                    );
                } else {
                    embed.addField(
                        'Large Text',
                        activity.assets.largeText,
                        true
                    );
                }
            }

            if (discordGameData.id && discordGameData.icon) {
                embed.setThumbnail(`https://cdn.discordapp.com/game-assets/${discordGameData.id}/${discordGameData.icon}.png`);
            }

            if (isDiscordStoreGame) {
                embed
                    .setURL(discordGameData.store_link)
                    .setTitle(`${discordGameData.name} on Discord Game Store`)
                    .setDescription(discordGameData.summary)
                    .setImage(discordGameData.thumbnail)
                    .addField('Discord Store URL', `[Click Here](${discordGameData.store_link})`, true)
                    .addField('Price', discordGameData.price, true)
                    .addField('Game Developer(s)', discordGameData.developers.join(', '), true)
                    .addField('Game Publisher(s)', discordGameData.publishers.join(', '), true);
            }

            deleteCommandMessages(msg, this.client);
            stopTyping(msg);

            return msg.embed(embed);
        } catch (err) {
            stopTyping(msg);
            if (/(noActivity|Cannot read property 'name' of null)/i.test(err.toString())) {
                return msg.embed({
                    author: {
                        name: member.user.tag,
                        url: `${member.user.displayAvatarURL()}?size=2048`,
                        iconURL: member.user.displayAvatarURL(),
                    },
                    color: msg.guild ? msg.guild.me.displayColor : 8190976,
                    fields: [
                        {
                            name: 'Activity',
                            value: 'Nothing',
                            inline: true,
                        }
                    ],
                    thumbnail: { url: member.user.displayAvatarURL() },
                });
            }
            const channel = this.client.channels.get(process.env.ISSUE_LOG_CHANNEL_ID) as TextChannel;

            channel.send(stripIndents`
                <@${this.client.owners[0].id}> Error occurred in \`activity\` command!
                **Server:** ${msg.guild.name} (${msg.guild.id})
                **Author:** ${msg.author.tag} (${msg.author.id})
                **Time:** ${moment(msg.createdTimestamp).format('MMMM Do YYYY [at] HH:mm:ss [UTC]Z')}
                **Member:** ${member.user.tag} (${member.id})
                **Error Message:** ${err}
            `);

            return msg.reply(oneLine`An error occurred but I notified ${this.client.owners[0].username}
                Want to know more about the error? Join the support server by getting an invite by using the \`${msg.guild.commandPrefix}invite\` command `);
        }
    }

    private convertType (type: string) {
        return type.toLowerCase() !== 'listening'
            ? type.charAt(0).toUpperCase() + type.slice(1)
            : 'Listening to';
    }

    private fetchExt (str: string) {
        return str.slice(-4);
    }
}
