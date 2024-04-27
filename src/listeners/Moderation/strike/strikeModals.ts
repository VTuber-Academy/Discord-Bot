import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Interaction, MessageActionRowComponentBuilder } from 'discord.js';
import strikeManager from '../../../lib/managers/strikeManager';
import config from '../../../../config.json';

@ApplyOptions<Listener.Options>({
	name: 'Strike Modals Handler',
	event: Events.InteractionCreate
})
export class UserEvent extends Listener {
	public override async run(interaction: Interaction) {
		if (!interaction.isModalSubmit()) return;

		const [command, subcommand, ...args] = interaction.customId.split(':');
		if (command !== 'strike') return;

		if (subcommand === 'appeal') {
			await interaction.message?.edit({ components: [] });

			const strikeId = interaction.fields.getTextInputValue('strike-id');
			const reason = interaction.fields.getTextInputValue('reason');

			const strikeUser = await strikeManager.get(args[0]);
			const strike = strikeUser.strikes.filter((s) => s.strikeId === strikeId);

			if (strike.length === 0) return interaction.reply({ content: 'Strike not found' });

			const server = await this.container.client.guilds.fetch(config.mainServer);
			const channel = await server.channels.fetch(config.strike.appealsChannel);
			if (!channel || !channel.isTextBased()) return;

			const embeds: EmbedBuilder[] = [];

			strike.forEach(async (s) => {
				embeds.push(
					new EmbedBuilder()
						.setTitle(s.strikeId)
						.setDescription(`Striked by <@${s.moderatorId}> on <t:${Math.floor(s.timestamp.getTime() / 1000)}:f>\n${s.reason}`)
						.setColor('NotQuiteBlack')
				);
			});

			embeds.push(
				new EmbedBuilder()
					.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
					.setTitle('Appeal')
					.setColor('Blurple')
					.setDescription(reason)
					.setTimestamp()
			);

			const appealRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`strike:appeal:accept:${args[0]}:${strikeId}`)
					.setLabel('Accept')
					.setStyle(ButtonStyle.Success)
					.setEmoji('✅'),
				new ButtonBuilder()
					.setCustomId(`strike:appeal:reject:${args[0]}:${strikeId}`)
					.setLabel('Reject')
					.setStyle(ButtonStyle.Danger)
					.setEmoji('⚠️')
			);

			await channel.send({ embeds, components: [appealRow] });
			await interaction.deferUpdate();
			return interaction.message?.edit({ content: 'Appeal submitted', embeds });
		}

		return;
	}
}
