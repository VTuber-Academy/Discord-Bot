import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import levelDatabase from '../lib/levelDataBase';
import { EmbedBuilder, Interaction } from 'discord.js';

@ApplyOptions<Listener.Options>({
	enabled: true,
	event: Events.InteractionCreate,
	name: 'Handle modify levels interactions'
})
export class UserEvent extends Listener {
	public override async run(interaction: Interaction) {
		if (!interaction.isModalSubmit()) return;

		const { customId } = interaction;
		const [action, type, userId] = customId.split(':');

		if (action === 'levels') {
			if (type === 'modify') {
				const experience = interaction.fields.getTextInputValue('experience');
				const level = interaction.fields.getTextInputValue('level');

				const profile = await levelDatabase.findOne({ id: userId });
				if (!profile) return;

				const member = await interaction.guild?.members.fetch(userId);
				if (!member) return;

				const successEmbed = new EmbedBuilder()
					.setTitle('Success!')
					.setDescription(`Successfully modified <@${userId}>'s levels`)
					.setColor('Green')
					.addFields([
						{ name: 'Levels', value: `${profile.level}  »  ${level}`, inline: true },
						{ name: 'Experience', value: `${profile.experience}  »  ${experience}`, inline: true }
					])
					.setThumbnail(member.displayAvatarURL())
					.setFooter({ text: 'Amari Levels' })
					.setTimestamp()
					.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

				profile.experience = parseInt(experience);
				profile.level = parseInt(level);
				await profile.save();

				return interaction.reply({ embeds: [successEmbed] });
			}
		}

		return;
	}
}
