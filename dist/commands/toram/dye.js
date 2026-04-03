import axios from "axios";
import * as cheerio from 'cheerio';
import logger from '../../utils/logger.js'

async function dyePredictor(f) {
	if (!dyePredictor.data)
	try {
		const response = await axios.get('https://tanaka0.work/AIO/en/DyePredictor/ColorWeapon')
		if (global.devMode) console.log(`Status Code: ${response.status}`);
		
		const $ = cheerio.load(response.data)
		let result = []
		let ctble = $('.color-wep-table')
			ctble.each((i,o) => {
				o = $(o)
				o.find('tbody tr').each((i,o) => {
					o = $(o)
					const data = {}
					data.bos = o.find('td:first').text().trim().replace(/\s+/g, ' ')
					data.color = o.find('td:last font').attr('style')?.match(/color:\s*([^;]+)/)?.[1].trim()
					data.dye = o.find('td:last').text().match(/[ABC0-9]{2,3}|Hidden/i)?.[0] || 'Unknown'
					result.push(data)
				})
			})
			dyePredictor.data = result
	} catch({code,status}) {
		if (global.devMode) logger.warn(`Status: ${status}/${code}`);
		return {err:`Status: ${status}/${code}`}
	}
	
	const { data } = dyePredictor
	let result = ''
	for( const {bos,color,dye} of data ) {
		if(!f||f==dye)
		result += `- ${bos} (◻️${dye})\n`
	}
	
	result += '\n_sumber: tanaka0.work_'
	return result
}


export const command = {
	command: 'dye',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '_Toram Online_',
	description: 'Prediksi dye senjata bulanan.',
	get help() {
		return `usage: .dye [color]`
	},
	handle: async (bot, m) => {
		const result = await dyePredictor(m.arguments[0]?.toUpperCase()||'')
		if(result.err)
			await m.reply(result.err)
		const date = new Date
		const body = `Color Weapon ( ${date.getFullYear()}${String(date.getMonth() +1).padStart(2,0)} )`
		await m.sendThum2('Dye Predictor', body, result, global.bot.thumb, '', global.bot.adsUrl, false, false, null)
	}
}