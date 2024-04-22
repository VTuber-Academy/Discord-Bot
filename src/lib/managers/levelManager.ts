import levelDatabase from './levelDataBase';

class LevelManager {
	async addXP(amount: number, toUserId: string) {
		return this.modifyXP(`+${amount}`, toUserId);
	}

	async removeXP(amount: number, toUserId: string) {
		return this.modifyXP(`-${amount}`, toUserId);
	}

	async fetchLeaderboard() {
		const entries = await levelDatabase.find({});

		return entries.sort((a, b) => {
			if (a.level === b.level) {
				return b.experience - a.experience;
			} else {
				return b.level - a.level;
			}
		});
	}

	private async modifyXP(amountAsString: string, toUserId: string) {
		let userEntry = await levelDatabase.findOne({ id: toUserId });

		if (!userEntry) {
			userEntry = new levelDatabase({ id: toUserId, level: 0, experience: 0 });
		}

		const amount = Number(amountAsString);
		userEntry.experience += amount;

		let isLevelUp = this.levelUpCheck(userEntry.level, userEntry.experience);
		const cacheLevelUp = isLevelUp;

		while (isLevelUp) {
			userEntry.experience -= this.calculateNextLevelXP(userEntry.level);
			userEntry.level += 1;

			isLevelUp = this.levelUpCheck(userEntry.level, userEntry.experience);
		}

		userEntry.lastActivity = new Date();

		await userEntry.save();
		return { isLevelUp: cacheLevelUp, profile: userEntry };
	}

	private levelUpCheck(currentLevel: number, currentXP: number) {
		return this.calculateNextLevelXP(currentLevel) < currentXP;
	}

	calculateNextLevelXP(currentLevel: number) {
		return 2 * currentLevel + 20 * currentLevel + 40;
	}
}

const levelManager = new LevelManager();
export default levelManager;
