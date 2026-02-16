import {Quran, translate} from '../../function/QuranEnc.js'
import logger from '../../utils/logger.js';

/*===============[0]==============*/
export const command = {
	command: 'q',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: 'Ensiklopedia',
	description: "Ensiklopedia Al-Qur'an.",
	get help() {
		return `usage: 
- #List surah & translate
- .q list
- #Read per-surah with page or per-ayat
- .q [surat|no.] [ [no.ayat] | [page <no>] ]
- #Set translate
- .q translate < language | translations_key >

> QuranEnc`
	},
	handle: async (bot, m) => {
		try {
			if (!m.arguments.length)
				return await m.reply(command.help)
			const [surah, ayat='page', page='1'] = (m.arguments[0] ||'').toLowerCase().split(' ')
			
			if (surah == 'list')
				await m.reply(`*QuranEnc*\nNo. | Surah\n${
					await Quran('list')
				}\n> ㅤ\nKey - Translations\n${
					translate.available.map(({key,title})=>`- \`${key}\` - ${title}`).join('\n')
				}\n> ㅤ\nLanguages:\n${
					translate.lang.join(', ')
				}`)
			else if (surah == 'translate')
				await m.reply(translate(ayat))
			else if (ayat == 'page')
				await m.reply(await Quran(surah, {page}))
			else
				await m.reply(await Quran(surah, ayat))
		} catch (e) {
			logger.error(e)
		}
	}
}