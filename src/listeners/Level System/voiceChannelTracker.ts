import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { EmbedBuilder, type VoiceState } from 'discord.js';
import levelManager from '../lib/levelManager';
import config from '../config.json';

const trackerMap = new Map<string, { realMinutes: number; activeMinutes: number; intervalId: NodeJS.Timeout }>();

@ApplyOptions<Listener.Options>({
	event: Events.VoiceStateUpdate,
	name: 'Level VoiceActivityTracker'
})
export class UserEvent extends Listener {
	public override async run(oldState: VoiceState, newState: VoiceState) {
		if (newState.channelId === config.afkVC) {
			if (!newState.member) return;
			await newState.member.voice.disconnect();

			const notificationEmbed = new EmbedBuilder()
				.setColor('Orange')
				.setTitle('Kicked for AFK!')
				.setDescription("To prevent farming for activity points, AFK for a prolonged period of time isn't permitted!")
				.setTimestamp();

			return newState.member.send({ embeds: [notificationEmbed] });
		}

		if (!oldState.channelId && newState.channelId) {
			if (!newState.member) return;

			const intervalId: NodeJS.Timeout = setInterval(() => {
				if (!newState.member) return clearInterval(intervalId);

				const tracker = trackerMap.get(newState.member.id);
				if (!tracker) return clearInterval(intervalId);

				let gains = 0;

				if (newState.channel?.members.size !== 1) {
					if (newState.member.voice.selfDeaf) {
						gains += 0;
					} else if (newState.member.voice.selfMute) {
						gains += 0.5;
					} else {
						gains += 1;
					}

					if (newState.member.voice.streaming) {
						gains += 0.2;
					}
				}

				tracker.activeMinutes += gains;
				tracker.realMinutes += 1;
			}, 60000);

			trackerMap.set(newState.member.id, { activeMinutes: 0, intervalId, realMinutes: 0 });
		} else if (oldState.channelId && !newState.channelId) {
			if (!oldState.member) return;

			const tracker = trackerMap.get(oldState.member.id);
			if (!tracker) return;

			let xp = 0;

			for (let minute = 0; minute < tracker.activeMinutes; minute++) {
				xp += Math.floor(Math.floor(Math.random() * 8) * ((minute + 1) / (tracker.activeMinutes + 1)));
			}

			const msg = await oldState.channel?.send(
				`**${oldState.member.displayName}** has gained **${xp}** XP for being in the voice channel for **${tracker.realMinutes}** minutes! (${tracker.activeMinutes} minutes rewarded)`
			);

			levelManager.addXP(xp, oldState.member.id).then(async (levelled) => {
				if (levelled) {
					await msg?.react('⭐');
				}
			});

			clearInterval(tracker.intervalId);
			trackerMap.delete(oldState.member.id);
		}

		return;
	}
}
