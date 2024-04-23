import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { EmbedBuilder } from 'discord.js';
import strikeManager from '../../lib/managers/strikeManager';

const categories = [
	{ name: 'Healthy Environment', value: '0' },
	{ name: 'Information Integrity', value: '1' },
	{ name: 'Feature Abuse', value: '2' },
	{ name: 'Content', value: '3' },
	{ name: 'Extreme', value: '4' },
	{ name: 'Other', value: '5' }
];

@ApplyOptions<Subcommand.Options>({
	description: 'Strikes a user',
	requiredUserPermissions: ['ModerateMembers'],
	requiredClientPermissions: ['SendMessages'],
	subcommands: [
		{
			name: 'add',
			chatInputRun: 'strikeAdd'
		},
		{
			name: 'remove',
			chatInputRun: 'strikeRemove'
		}
	]
})
export class UserCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((command) =>
					command
						.setName('add')
						.setDescription('Strikes a user')
						.addUserOption((option) => option.setName('target').setDescription('Member to strike').setRequired(true))
						.addStringOption((option) =>
							option
								.setName('category')
								.setDescription('Category the breach took place in')
								.setRequired(true)
								.addChoices(...categories)
						)
						.addStringOption((option) => option.setName('reason').setDescription('Detailed reason for a strike').setRequired(true))
						.addIntegerOption((option) =>
							option.setName('strikes').setDescription('amount to strike').setRequired(true).setMinValue(1).setMaxValue(4)
						)
						.addUserOption((option) => option.setName('victim').setDescription('Main affected member / Reported by...?'))
				)
				.addSubcommand((command) =>
					command
						.setName('remove')
						.setDescription('Removes a strike')
						.addUserOption((option) => option.setName('target').setDescription('Member to remove the strike from').setRequired(true))
						.addStringOption((option) => option.setName('uuid').setDescription('The ID of the strike to remove').setRequired(true))
				)
		);
	}

	public async strikeAdd(interaction: Subcommand.ChatInputCommandInteraction) {
		const targetUser = interaction.options.getUser('target', true);
		const category = categories[parseInt(interaction.options.getString('category', true))];
		const reason = interaction.options.getString('reason', true);
		const victim = interaction.options.getUser('victim');
		const strikes = interaction.options.getInteger('strikes', true);

		await strikeManager.add(targetUser, `${category.name} - ${reason}\n\nVictim: ${victim?.username ?? 'N/A'}`, strikes, interaction.user);

		const strikeSuccessEmbed = new EmbedBuilder()
			.setAuthor({ name: '@' + interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
			.setColor('Green')
			.setThumbnail('https://cdn3.emoji.gg/emojis/success.gif')
			.setTitle(`${strikes} strikes added!`)
			.setDescription(`Successfully added ${strikes} strikes to ${targetUser.username}`)
			.addFields([
				{ name: 'Category', value: category.name, inline: true },
				{ name: 'Reason', value: reason, inline: true }
			])
			.setTimestamp();

		if (victim) {
			strikeSuccessEmbed.addFields({ name: 'Reported by:', value: victim.username });
		}

		const standingsEmbed = await strikeManager.generateStandings(targetUser);
		await targetUser.send({ content: 'You have been **striked**!', embeds: [standingsEmbed] });

		return interaction.reply({ embeds: [strikeSuccessEmbed, standingsEmbed] });
	}

	public async strikeRemove(interaction: Subcommand.ChatInputCommandInteraction) {
		const targetUser = interaction.options.getUser('target', true);
		const strikeId = interaction.options.getString('uuid', true);

		const strike = await strikeManager.remove(targetUser, strikeId);
		if (!strike) {
			return interaction.reply({ content: 'Could not find strike with user!', ephemeral: true });
		}

		const generateStandings = await strikeManager.generateStandings(targetUser);

		const strikeSuccessEmbed = new EmbedBuilder()
			.setAuthor({ name: '@' + interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
			.setColor('Green')
			.setThumbnail('https://cdn3.emoji.gg/emojis/success.gif')
			.setTitle(`Strike reverted!`)
			.setDescription(`Strike with ID: ${strikeId} has been removed from ${targetUser.username}!\n\n${strike?.reason}`)
			.setTimestamp();

		await targetUser.send({ content: 'Strike removed!', embeds: [strikeSuccessEmbed, generateStandings] });

		return interaction.reply({ content: 'Strike removed!', embeds: [strikeSuccessEmbed, generateStandings], ephemeral: true });
	}
}
