import path from 'path';
import { jidDecode } from 'baileys';
import logger from '../../utils/logger.js';

export const command = {
	command: 'husbu',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: 'Anime',
	description: 'kimi wa kakkoii.. honto!!.',
	get help() {
		return 'usage:'
		+'\n`.husbu` random husbando.'
	},
	handle: async (bot, m) => {
		const tag = m.arguments[0]?.toLowerCase()
		
		await m.reply({ react: { text: '⏳', key: m.key } }, false)
		
		var reply = {}
		try {
			reply = await Pics.random()
			reply = reply.endsWith('.gif')
			 ? {
				image: { url: reply},
				caption: 'Anim'
			} /*{
				document: { url: reply },
				fileName: path.basename(reply),
				mimetype: 'image/gif',
				caption: 'Animated'
			}*/ : {
				image: { url: reply}
			}
		} catch (err) {
			logger.warn(err),
			reply = { text: "Not found." }
		}
		const pn = jidDecode(m.senderPn)?.user
		await m.reply( {
			...{
				contextInfo: {
					mentionedJid: [m.sender]
				}
			},
			...reply
		}, true, /*reply.document ? null:*/ {
			backgroundColor: '',
			ephemeralExpiration: 86400,
			quoted: {
				key: {
					fromMe: true,
					id: m.id,
					participant: m.sender,
					remoteJid: m.senderPn,
				},
				message: {
					contactMessage: {
						displayName: m.pushName,
						vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${m.pushName}\nTEL;type=CELL;waid=${pn}:${pn}\nEND:VCARD`
					},
				},
			},
		})
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}

const API_URL = 'https://nekos.best/api/v2/husbando'
const endpoints = {}

const Pics = {
	fetch (url) {
		return fetch(url).then(this.parseResponse)
	},
	async random() {
		const response = await this.fetch(API_URL)
		
		return response.results?.[0]?.url
	},
	async parseResponse (response) {
		if (!response.ok) {
			const failure = await response.text()
	
			throw new Error(failure)
		}
	
		return response.json()
	},
}