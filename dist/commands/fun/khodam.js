import fs from 'fs'
import path from 'path'
import logger from '../../utils/logger.js'
import { jidDecode } from 'baileys'

class LCG {
	constructor(seed) {
		this.seed = seed;
		this.a = 1664525;
		this.c = 1013904223;
		this.m = 2 ** 32;
		this.x = seed;
	}

	next() {
		this.x = (this.a * this.x + this.c) % this.m;
		return this.x / this.m;
	}
}

export const command = {
	command: 'khodam',
	tag: 'Game & Fun',
	description: 'Cek khodam lewat no.tlp atau kamu bisa sebut nama kamu biar jelas :).',
	help: 'usage: `.khodam [Nama Lengkap]`',
	handle: async (bot, m) => {
		var name, text = '',
			thumb = './assets/toram/texture/rf_acme.jpg',
			media = 'robz.bot/vid?q='+Date.now()
		try {
			if ( m.arguments.length )
				name = m.arguments.join(global.bot.splitArgs)
			else
				name = jidDecode(m.senderPn)?.user
			
				const khodam = getKhodamByName(name)
				
				if (khodam.image)
					thumb = './'+khodam.image
				else
					text = 'Khodam Kamu Adalah\n'
				text += `✨${khodam.name}✨`
		
			await m.sendThum2
			(
				global.bot.name,
				"Khodam",
				text,
				thumb,
				'',
				media,
				false,
				false,
				bot.quoteContact(m)
			)
		} catch(e) {
			logger.warn(e)
		}
	},
}

const lcg = new LCG(global.setting.seed_khodam || 3421985);

const khodam_r = fs.readFileSync(path.resolve(process.cwd(), 'assets','khodam', 'list.txt'), 'utf-8')
				 ?.split('\n')
				 .filter(a=>a)
				 || []

const khodam_s = [
    {id:lcg.next() * khodam_r.length + 8,name: 'Khodam Jin', image: 'assets/khodam/jin.jpeg'},
    {id:lcg.next() * khodam_r.length + 8,name: 'Khodam Malaikat', image: 'assets/khodam/malaikat.jpeg'},
    {id:lcg.next() * khodam_r.length + 8,name: 'Khodam Raja Macan', image: 'assets/khodam/macan.jpeg'},
    {id:lcg.next() * khodam_r.length + 8,name: 'Khodam Harimau Putih', image: 'assets/khodam/harimauputih.jpeg'},
    {id:lcg.next() * khodam_r.length + 8,name: 'Khodam Buaya Putih', image: 'assets/khodam/buaya.jpeg'},
    {id:lcg.next() * khodam_r.length + 8,name: 'Khodam Ular Naga', image: 'assets/khodam/ularnaga.jpg'},
    {id:lcg.next() * khodam_r.length + 8,name: 'Khodam Nyi Roro Kidul', image: 'assets/khodam/roro.jpeg'},
    {id:lcg.next() * khodam_r.length + 8,name: 'Khodam Dewa Zeus', image: 'assets/khodam/zeus.jpeg'},
    ... khodam_r.map(name=>({id:lcg.next() * khodam_r.length, name}))
].sort((a,b) => a.id - b.id);

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