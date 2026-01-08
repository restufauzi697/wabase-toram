import fs from 'fs'
import path from 'path'
import logger from '../../utils/logger.js'

export const command = {
	command: 'khodam',
	tag: 'Utilitas',
	description: 'Cek khodam kamu di sini.',
	help: 'usage: `.khodam [name]` ~atau dengan foto agar jelas :).~',
	handle: async (bot, m) => {
		var name, khodam,
			thumb = global.bot.thumb
		if ( m.arguments.length )
			name = m.arguments.join(global.bot.splitArgs),
			khodam = getKhodamByName(name),
			thumb = r_a+'/'+khodam.image,
			khodam = '*Khodam Kamu Adalah*\n    【'+khodam.name+'】'
		else
			khodam = 'result:\n'+khodam_r[Math.floor(Math.random() * khodam_r.length)]
		
		try {
			await m.sendThum2
			(
				global.bot.name,
				"Khodam",
				khodam,
				thumb,
				null,
				'',
				'',
				false,
				true
			)
		} catch(e) {
			logger.warn(e)
		}
	},
}

const r_a = "https://raw.githubusercontent.com/restufauzi697/wabase-toram/refs/heads/main/assets"

const khodam_s = [
    {name: 'Khodam Jin', image: 'assets/khodam/jin.jpeg'},
    {name: 'Khodam Malaikat', image: 'assets/khodam/malaikat.jpeg'},
    {name: 'Khodam Raja Macan', image: 'assets/khodam/macan.jpeg'},
    {name: 'Khodam Harimau Putih', image: 'assets/khodam/harimauputih.jpeg'},
    {name: 'Khodam Buaya Putih', image: 'assets/khodam/buaya.jpeg'},
    {name: 'Khodam Ular Naga', image: 'assets/khodam/ularnaga.jpg'},
    {name: 'Khodam Nyi Roro Kidul', image: 'assets/khodam/roro.jpeg'},
    {name: 'Khodam Dewa Zeus', image: 'assets/khodam/zeus.jpeg'}
];

const khodam_r = fs.readFileSync(path.resolve(process.cwd(), 'assets','khodam', 'list.txt'), 'utf-8')?.split('\n')

// Function to hash the name and map it to an index
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function getKhodamByName(name) {
    const index = Math.abs(hashCode(name)) % khodam_s.length;
    return khodam_s[index];
}