import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ActionRowBuilder, Interaction, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import strikeManager from '../../../lib/managers/strikeManager';

@ApplyOptions<Listener.Options>({
	event: Events.InteractionCreate,
	name: 'Strike Button Handler'
})
export class UserEvent extends Listener {
	public override async run(interaction: Interaction) {
		if (!interaction.isButton()) return;

		const [command, subcommand, ...args] = interaction.customId.split(':');

		if (command === 'strike') {
			if (subcommand === 'ban') {
				const user = await interaction.guild?.members.fetch(args[0]);
				if (!user) return interaction.reply({ content: 'User not found', ephemeral: true });

				const strikes = await strikeManager.get(user.id);

				await interaction.guild?.bans.create(user, {
					reason: `Strike limit reached, ${interaction.user} approves of the ban.\n\n${strikes.strikes
						.map((strike) => {
							strike.timestamp.toLocaleDateString('en-US') + ' - ' + strike.reason;
						})
						.join(`\n`)}`
				});

				return interaction.message.edit({ content: 'User has been banned', components: [] });
			} else if (subcommand === 'appeal') {
				const row1 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
					new TextInputBuilder()
						.setCustomId('strike-id')
						.setLabel('Strike ID (DO NOT CHANGE)')
						.setPlaceholder('Bruh I told you to not change, cancel and click the button again')
						.setValue(args[1])
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
				);

				const row2 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
					new TextInputBuilder()
						.setCustomId('reason')
						.setLabel('Reason to appeal')
						.setPlaceholder('Be descriptive')
						.setMaxLength(4096)
						.setRequired(true)
						.setStyle(TextInputStyle.Paragraph)
				);

				const Modal = new ModalBuilder().addComponents(row1, row2).setCustomId(`strike:appeal:${args[0]}`).setTitle('Strike Appeal');

				return interaction.showModal(Modal);
			}
		}

		return;
	}
}
