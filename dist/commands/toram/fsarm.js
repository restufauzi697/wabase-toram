import { stats_list, postStattingFromInput, formatResult, shortToStat } from "../../utils/tanaka0/fillstat.js";
import logger from '../../utils/logger.js';

const caption_stats = {
	atk: 'Attack\n',
	cr: '\n\nCritical\n',
	aspd: '\n\nSpeed\n',
	str: '\n\nPlayer Stats\n',
	hp: '\n\nHP/MP\n',
	def: '\n\nDefense\n',
	acc: '\n\nAccuracy\n',
	dodge: '\n\nDodge\n',
	dtefire: '\n\nElements - Stronger Against\n',
	rtefire: '\n\nElements - Resistance\n',
	ailment: '\n\nSpecial\n',
}

export const command = {
	command: 'fsarm',
	tag: 'Toram Online',
	description: 'Buat rumus fill stat arm.',
	get help() {
		return `*Tips*
- Gunakan \`.fsarm [potensial] <rumus stats>\` dan dapatkan rumus.
- Gunakan \`.fsarm <list|stats>\` untuk lihat daftar stat didukung.
- Setiap stat negatif diawali '-'
- Pisahkan setiap stat dengan koma (,) ya..
- Default potensial 110

contoh:
- .fsarm 110 matk%12,int%10,cd,cr,-pp,-acc%,acc=18
- .fsarm list

Perhatikan untuk 2 stat ini
- Dodge lv-17 berarti Dodge -24, dan
- Accuracy lv-17 berarti Accuracy -24`;
	},
	handle: async (bot, m) => {
		// clean text
		const input = m.text.replace(/^\S*\b/, '').trim()
		
		if (!input || /help|\?/.test(input))
			return await m.reply(command.help)
		
		if (/list|stats?/.test(input))
			return await m.reply([
				'*Daftar shorthand stat zirah*',
				'',
				stats_list.map(([a,[b,max,min]])=>`${caption_stats[a]||''}- ${a} ➜ ${b}\n    🔺 maximal: Lv.${max}${
					max !== min ?
					'\n    🔻 minimal: Lv.-'+min:''
				}`).join`\n`
			].join`\n`)
		
		const [, pot, stats] = /(\d*)\s*(.+)/.exec(input)
		
		await m.reply({ react: { text: '⏳', key: m.key } }, false)
		try {
			const html = await postStattingFromInput(pot||110, stats)
			await m.reply(`${formatResult(html)}\n\nsumber: tanaka0.work`, true, {quoted: bot.quoteContact(m)})
		} catch(e) {
			logger.error(e)
			await m.reply(e.message)
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	}
};