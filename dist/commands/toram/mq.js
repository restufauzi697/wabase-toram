import quest from "../../utils/toram/Quest.js";
import { ToramLevelSystem } from '../../lib/ToramLevelSystem.js';
import logger from '../../utils/logger.js';

export const command = {
	command: 'mq',
	tag: 'Toram Online',
	description: 'Hitung progress MQ (Main Quest)',
	get help() {
		return `*Tips*
- Gunakan _.mq <level> <persen%> <start> <end> [skip_venena]_
- Gunakan nomor \`bab\` atau \`bab.sub\` untuk \`<start>\` dan \`<end>\`
- 'skip' atau 'yes' jika ingin lewatkan misi venena.

Contoh:
.mq 150 20% 9.3 15
.mq 150 20% 9.3 15 skip`;
	},
	async handle(bot, m) {
		try {
			if (!m.arguments[0]) return await m.reply(this.help);
			if (/perbarui|load/i.test(m.arguments[0])) return await quest(true), await m.reply('Daftar quest diperbarui.')
			const { mq:quests } = await quest()
			const command = m.text
			const { level, percent, startId, endId, skipIds } = ToramLevelSystem.parseMQCommand(command, quests);
			const result = ToramLevelSystem.calculateMQProgress(level, percent, startId, endId, skipIds, quests);
			const text = ToramLevelSystem.formatMQResult(result, /\bdetail|perolehan/i.test(m.text));
			return await m.sendThum2('Toram Online', 'Kalculator EXP Main Quest', text, global.bot.banner, '', global.bot.adsUrl, false, false, null);
		} catch (err) {
			logger.warn(err, 'err: .mq')
			return await m.reply(err.message);
		}
	}
};