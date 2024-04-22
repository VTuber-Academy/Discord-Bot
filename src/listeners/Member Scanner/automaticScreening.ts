import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	GuildMember,
	GuildTextBasedChannel,
	MessageActionRowComponentBuilder
} from 'discord.js';
import { scanner } from '../../../config.json';
import { createReadStream } from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { DateTime } from 'luxon';
import axios from 'axios';

interface ScreeningResults {
	isFlagged: boolean;
	redFlags: string[];
}

interface ExtractedDataFields {
	'Year of Birth': string;
	Gender: string;
	Ethnicity: string;
	"Child's First Name": string;
	Count: string;
	Rank: string;
}

let commonEnglishNames: string[] = [];

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberAdd
})
export class UserEvent extends Listener {
	public override async run(member: GuildMember) {
		this.screenMember(member);
	}

	private async parseNames() {
		return new Promise((resolve, reject) => {
			const names: string[] = [];
			const stream = createReadStream(path.join(__dirname, '../../lib/CommonEnglishNames.csv')).pipe(csvParser());

			stream.on('data', (row: ExtractedDataFields) => {
				if (row["Child's First Name"]) {
					names.push(row["Child's First Name"]);
				}
			});

			stream.on('end', () => {
				resolve(names);
			});

			stream.on('error', (error: any) => {
				reject(error);
			});
		});
	}

	private async screenMember(member: GuildMember) {
		try {
			const staffChannel = (await member.guild.channels.fetch(scanner.securityGate).catch((err) => {
				throw new Error(`[Sentry] Failed, errored while fetching the staff channel!\n${err}`);
			})) as GuildTextBasedChannel;

			this.container.client.logger.debug(`[Sentry] Screening started for [${member.user.username}](${member.user.id})`);
			const screeningResults: ScreeningResults = { isFlagged: false, redFlags: [] };

			const tranquilizerRole = await member.guild.roles.fetch(scanner.tranquilizerRole).catch((err) => {
				throw new Error(`[Sentry] Failed, errored while fetching the tranquilizer role!\n${err}`);
			});
			if (!tranquilizerRole) return;

			if (commonEnglishNames.length === 0) {
				commonEnglishNames = (await this.parseNames()) as string[];
				member.client.logger.debug(`[Sentry] parsed ${commonEnglishNames.length} names`);
			}

			// Convert the array of names into a regex pattern which we will later match
			const generatedUsernameRegex = new RegExp(commonEnglishNames.join('|'), 'i');

			const staffEmbed = new EmbedBuilder()
				.setColor('DarkButNotBlack')
				.setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
				.setThumbnail('https://cdn3.emoji.gg/emojis/2592-greendiscordshield.png')
				.addFields([
					{ name: 'User:', value: `${member}`, inline: true },
					{ name: 'Account Age:', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
				])
				.setTimestamp();

			if (DateTime.fromJSDate(member.user.createdAt) > DateTime.now().minus({ months: 6 })) {
				if (DateTime.fromJSDate(member.user.createdAt) > DateTime.now().minus({ months: 1 })) {
					screeningResults.isFlagged = true;
					screeningResults.redFlags.push('❗ Account Age Younger than 1 month');
				} else {
					screeningResults.redFlags.push('❕ Account Age Younger than 6 months');
				}
			}

			const usernameMatcher = generatedUsernameRegex.exec(member.user.username);
			if (usernameMatcher) {
				screeningResults.redFlags.push(`❕ Username has items from the common english names registry!`);
			}

			this.container.client.logger.debug(`[Sentry] matched ${usernameMatcher} in ${member.user.username}`);

			const displayNameMatcher = generatedUsernameRegex.exec(member.user.displayName);
			if (displayNameMatcher) {
				screeningResults.redFlags.push(`❕ Display Name has items from the common english names registry!`);
			}

			member.client.logger.debug(`[Sentry] matched ${displayNameMatcher} in ${member.user.displayName}`);

			let nsfwProfileAPIoptions = {
				method: 'POST',
				url: 'https://api.edenai.run/v2/image/explicit_content',
				headers: {
					Authorization: `Bearer ${process.env.EdenAI}`
				},
				data: {
					show_original_response: false,
					fallback_providers: '',
					providers: 'api4ai',
					file_url: member.user.displayAvatarURL({ extension: 'png', size: 128 })
				}
			};

			await axios.request(nsfwProfileAPIoptions).then(
				(response) => {
					staffEmbed.addFields([{ name: 'profile picture NSFW Likelihood:', value: `${response.data['eden-ai'].nsfw_likelihood} / 5` }]);
					if (response.data['eden-ai'].nsfw_likelihood === 5) {
						screeningResults.isFlagged = true;
					} else if (response.data['eden-ai'].nsfw_likelihood > 3) {
						screeningResults.redFlags.push(
							`❗ Eden detects suggestive profile picture\n- NSFW Likelihood: ${response.data['eden-ai'].nsfw_likelihood} / 5`
						);
					}
				},
				(error) => {
					staffChannel.send(`Cannot scan ${member}'s pfp with AI`);
					console.log(error);
				}
			);

			if (!screeningResults.isFlagged && screeningResults.redFlags.length >= 2) {
				screeningResults.isFlagged = true;
			}

			const staffActionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`screening-approve-${member.user.id}`)
					.setLabel(`Let ${member.user.username} in!`)
					.setStyle(ButtonStyle.Success)
					.setEmoji('⭐'),
				new ButtonBuilder()
					.setCustomId(`screening-reject-${member.user.id}`)
					.setLabel(`Ban ${member.user.username}`)
					.setStyle(ButtonStyle.Danger)
					.setEmoji('🔨')
			);

			if (screeningResults.isFlagged) {
				staffEmbed.setThumbnail('https://cdn3.emoji.gg/emojis/4133-bluediscordshield.png');
				await member.roles.add(tranquilizerRole);

				staffEmbed.addFields([{ name: 'Triggers:', value: screeningResults.redFlags.join('\n') }]);
				staffEmbed.setFooter({
					text: 'Waiting for staff input...',
					iconURL: 'https://cdn3.emoji.gg/emojis/4517-warning.png'
				});
			} else {
				staffEmbed.setFooter({
					text: 'User has been approved! 🎉'
				});
			}

			await staffChannel.send({ embeds: [staffEmbed], components: [staffActionRow] });
		} catch (error) {
			this.container.logger.error(`[Sentry] failed to screen @${member.user.username}[${member.user.id}]`);
			this.container.logger.error(error);
		}
	}
}
