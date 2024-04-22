import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ChannelType, MessageType, type Message, EmbedBuilder } from 'discord.js';
import { Duration } from '@sapphire/duration';
import config from '../config.json';
import levelManager from '../lib/levelManager';

const cooldownMap = new Map<string, number>();

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
	name: 'Level MessageCreate'
})
export class UserEvent extends Listener {
	public override async run(message: Message) {
		if (
			message.channel.type === ChannelType.DM ||
			cooldownMap.has(message.author.id) ||
			message.author.bot ||
			config.IgnoreChannels.find((id) => id === message.channelId) ||
			message.type !== MessageType.Default
		)
			return;

		const xp = Math.floor(Math.random() * 16) + 15;
		await levelManager.addXP(xp, message.author.id).then(async (levelled) => {
			const firstTimeEmbedLevel = new EmbedBuilder()
				.setColor('Blurple')
				.setDescription(
					'Congratulations for levelling up for the first time in this cycle! Your message has been reacted with a ⭐ to indicate that you have levelled up!\n\nYou can always check your rank and leaderboard by using the levels command within the server!\n\nThe top 3 members active in the server will be rewarded with a special role at the end of the cycle! Good luck!'
				)
				.setFooter({ text: 'This notification will only be shown once per cycle!' })
				.setTimestamp();

			if (levelled.isLevelUp) {
				await message.react('⭐').catch((err) => message.client.logger.error(err));

				if (levelled.profile.level === 1) {
					await message.author.send({ embeds: [firstTimeEmbedLevel] }).catch(() => 0);
				}
			}
		});

		cooldownMap.set(message.author.id, Date.now());
		setTimeout(() => {
			cooldownMap.delete(message.author.id);
		}, new Duration(config.messageCooldown).offset);
	}
}
