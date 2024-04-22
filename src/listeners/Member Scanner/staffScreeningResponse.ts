import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Interaction, MessageActionRowComponentBuilder } from 'discord.js';
import config from '../../config.json';

@ApplyOptions<Listener.Options>({
	event: Events.InteractionCreate,
	name: 'Automated Screening Interaction Handler'
})
export class UserEvent extends Listener {
	public override async run(interaction: Interaction) {
		if (interaction.isButton()) {
			const args = interaction.customId.split('-');

			if (args[0] != 'screening') return;
			const member = args[2] ? await interaction.guild?.members.fetch(args[2]).catch(() => undefined) : undefined;
			if (!member) return interaction.reply({ content: 'Cannot find member in the server!', ephemeral: true });

			const resultsEmbed = new EmbedBuilder()
				.setColor('DarkButNotBlack')
				.setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
				.addFields([
					{ name: 'User:', value: `${member}`, inline: true },
					{ name: 'Account Age:', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
				])
				.setTimestamp();

			const decoratedButton = new ButtonBuilder().setCustomId('notlikethismatters').setDisabled(true);
			const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();

			switch (args[1]) {
				case 'approve':
					resultsEmbed.setThumbnail('https://cdn3.emoji.gg/emojis/2592-greendiscordshield.png');
					if (!member) return interaction.reply({ content: 'Cannot find member in the server!', ephemeral: true });

					decoratedButton.setLabel(`Approved by @${interaction.user.username}`).setStyle(ButtonStyle.Success);
					actionRow.addComponents(decoratedButton);
					await interaction.update({ embeds: [resultsEmbed], components: [actionRow] });

					return member.roles
						.remove(config.tranquilizerRole)
						.catch((err) => interaction.reply({ content: `Failed to remove role\nReason: ${err}` }));
				case 'reject':
					resultsEmbed.setThumbnail('https://cdn3.emoji.gg/emojis/4881-reddiscordshield.png');

					decoratedButton.setLabel(`Rejected by @${interaction.user.username}`).setStyle(ButtonStyle.Danger);
					actionRow.addComponents(decoratedButton);
					await interaction.update({ components: [actionRow] });

					return interaction.guild?.bans.create(args[2], {
						reason: `Suspicious or Spam Account\nResponsible moderator: @${interaction.member?.user.username} (${interaction.user.id})`
					});
				default:
					return this.container.logger.warn(`Unexpected screening argument "${args[1]}"`);
			}
		}
	}
}
