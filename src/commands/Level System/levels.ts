import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import levelDatabase from '../../lib/models/levelDataBase';
import {
	ActionRowBuilder,
	ColorResolvable,
	EmbedBuilder,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import levelManager from '../../lib/managers/levelManager';
import { levels } from '../../../config.json';

@ApplyOptions<Subcommand.Options>({
	name: 'Levels',
	description: 'All Level related commands',
	cooldownDelay: 5000,
	requiredClientPermissions: ['SendMessages', 'ViewChannel'],
	runIn: 'GUILD_TEXT',
	subcommands: [
		{
			name: 'rank',
			chatInputRun: 'rankCommand'
		},
		{
			name: 'leaderboard',
			chatInputRun: 'leaderboardCommand'
		},
		{
			name: 'modify',
			chatInputRun: 'modifyCommand',
			requiredUserPermissions: ['ManageRoles']
		},
		{
			name: 'finalize',
			chatInputRun: 'finalizeCycle',
			requiredUserPermissions: ['Administrator']
		},
		{
			name: 'role',
			chatInputRun: 'roleCommand'
		}
	]
})
export class UserCommand extends Subcommand {
	// Register slash and context menu command
	override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((command) =>
					command
						.setName('modify')
						.setDescription("Make changes to a member's level and experience")
						.addUserOption((input) => input.setName('target').setDescription('The user that is going get the change').setRequired(true))
				)
				.addSubcommand((command) => command.setName('leaderboard').setDescription("Ladders of every member's activity"))
				.addSubcommand((command) =>
					command
						.setName('rank')
						.setDescription("View a member's level rank")
						.addUserOption((input) => input.setName('user').setDescription('The member to be audited'))
				)
				.addSubcommand((command) => command.setName('finalize').setDescription('Finalize the current level cycle period!'))
				.addSubcommand((command) =>
					command
						.setName('role')
						.setDescription('Customize the color of your name in the server!')
						.addStringOption((option) =>
							option.setName('hex-color').setDescription('The color you want your name to be! IN HEX!').setRequired(true)
						)
				)
		);
	}

	public async rankCommand(interaction: Subcommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const targetUser = interaction.options.getUser('user') ?? interaction.user;
		const targetProfile = await levelDatabase.findOne({ id: targetUser.id });

		if (!targetProfile) {
			return interaction.editReply(`${targetUser} has never meowed in the server before! (╯°□°)╯︵ ┻━┻`);
		}

		const emojibar: string[] = [];
		const percentageToLevelUp = targetProfile.experience / levelManager.calculateNextLevelXP(targetProfile.level);

		const barLength = 8;
		const filledCount = Math.floor(percentageToLevelUp * barLength);

		for (let i = 0; i < barLength; i++) {
			if (i === 0) {
				emojibar.push(filledCount > 0 ? '<:barstartfill:1169144871530004480>' : '<:barstartempty:1169144868136828929>');
			} else if (i === barLength - 1) {
				emojibar.push(filledCount >= barLength ? '<:barendfill:1169144857814650962>' : '<:barendempty:1169144854362718278>');
			} else if (i < filledCount) {
				emojibar.push('<:barmiddlefill:1169144859882426510>');
			} else {
				emojibar.push('<:barmiddleempty:1169144863908970556>');
			}
		}

		const card = new EmbedBuilder()
			.setColor('Gold')
			.setTitle(
				`✨   Level ${targetProfile.level}  «  [${targetProfile.experience} / ${levelManager.calculateNextLevelXP(targetProfile.level)}]   ⭐`
			)
			.setDescription(`### ${emojibar.join('')}`)
			.setTimestamp()
			.setThumbnail('https://cdn3.emoji.gg/emojis/1835-pixelpaws.png')
			.setAuthor({ iconURL: targetUser.displayAvatarURL(), name: targetUser.username });

		return interaction.editReply({ embeds: [card] });
	}

	public async leaderboardCommand(interaction: Subcommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const leaderboardEmbed = new EmbedBuilder()
			.setColor('Aqua')
			.setTitle('**Top 10 Active Members!**')
			.setFooter({ text: 'Talk in the server to get a ranking!' });

		const allUsers = await levelDatabase
			.find({})
			.sort({ level: -1, experience: -1 })
			.catch(() => []);

		const memberRanking = allUsers.findIndex((member) => member.id === interaction.user.id) + 1;
		if (memberRanking !== 0) leaderboardEmbed.setFooter({ text: `You rank #${memberRanking}!` });

		const topTen = allUsers.slice(0, 10);
		leaderboardEmbed.setDescription(
			allUsers.length === 0
				? 'No Data Available!'
				: topTen.map((member, index) => `#${index + 1} - <@${member.id}> - Level: ${member.level} Exp: ${member.experience}`).join('\n')
		);

		return interaction.editReply({
			embeds: [leaderboardEmbed]
		});
	}

	public async modifyCommand(interaction: Subcommand.ChatInputCommandInteraction) {
		const target = interaction.options.getUser('target', true);

		let profile = await levelDatabase.findOne({ id: target.id });
		if (!profile) {
			profile = new levelDatabase({
				id: target.id,
				level: 0,
				experience: 0
			});
		}

		const levelRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('level')
				.setLabel('Level')
				.setRequired(true)
				.setStyle(TextInputStyle.Short)
				.setValue(profile.level.toString())
				.setPlaceholder('0')
		);

		const experienceRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('experience')
				.setLabel('Experience')
				.setRequired(true)
				.setStyle(TextInputStyle.Short)
				.setValue(profile.experience.toString())
				.setPlaceholder('0')
		);

		const modifyPrompt = new ModalBuilder()
			.addComponents(levelRow, experienceRow)
			.setCustomId(`levels:modify:${target.id}`)
			.setTitle(`Modify ${target.username}`);

		return interaction.showModal(modifyPrompt);
	}

	public async finalizeCycle(interaction: Subcommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		// All users ranked highest to lowest
		const allUsers = await levelDatabase
			.find({})
			.sort({ level: -1, experience: -1 })
			.catch(() => []);

		const topThree = allUsers.slice(0, 3);

		const activeRole = await interaction.guild?.roles.fetch(levels.roleRewards[3]);
		if (!activeRole) return interaction.channel?.send(`Can't find active role ${levels.roleRewards[3]}`);

		// Reset active role
		activeRole.members.forEach(async (member) => {
			await member.roles.remove(activeRole);
		});

		topThree.forEach(async (member, i) => {
			// Fetch all required info from discord
			const discordMember = await interaction.guild?.members.fetch(member.id);
			if (!discordMember) return interaction.channel?.send(`Can't find ${member.id} within the server`);

			const rewardRole = await interaction.guild?.roles.fetch(levels.roleRewards[i]);
			if (!rewardRole) return interaction.channel?.send(`Can't find reward role ${levels.roleRewards[i]}`);

			// Reset role
			rewardRole.members.forEach(async (member) => {
				await member.roles.remove(rewardRole);
			});
			await rewardRole.setColor('Default');

			await discordMember.send(
				`Congratulations! In the last period, you ranked [#${
					i + 1
				}] within the VTA in terms of activity!\n\nYou now have access to /level role to customize your appearance within the server!`
			);

			// Delay so that we don't accidentally spam the server
			await new Promise((resolve) => setTimeout(resolve, 5000));

			return discordMember.roles.add([rewardRole, activeRole], 'Level Cycle Finalized!');
		});

		// Clear the database
		await levelDatabase.deleteMany({});

		// Finalize the interaction
		return interaction.editReply({ content: 'Finalized the level cycle!' });
	}

	public async roleCommand(interaction: Subcommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const member = await interaction.guild?.members.fetch(interaction.user.id);

		const detectedRewardRoleId = levels.roleRewards.filter((role) => member?.roles.cache.has(role));
		if (detectedRewardRoleId.length === 0) return interaction.editReply({ content: "You don't have a role reward role!" });

		const hexColor = interaction.options.getString('hex-color', true) as ColorResolvable;
		const rewardRoleObject = await interaction.guild?.roles.fetch(detectedRewardRoleId[0]);
		if (!rewardRoleObject) return interaction.editReply({ content: 'We ran into an error when looking for the reward role in the server' });

		try {
			await rewardRoleObject.setColor(hexColor);
			return interaction.editReply({ content: 'Your role color has been updated!' });
		} catch (error) {
			return interaction.editReply({ content: `We ran into an error when trying to update your role color!\n\nError:\`\`\`${error}\`\`\`` });
		}
	}
}
