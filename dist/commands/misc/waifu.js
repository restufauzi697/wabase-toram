import path from 'path';
import { jidDecode } from 'baileys';
import logger from '../../utils/logger.js';

export const command = {
	command: 'waifu',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: 'Generator',
	description: 'waifu siapa ini?.',
	get help() {
		return 'usage:'
		+'\n`.waifu`, random waifu kamu.'
	},
	handle: async (bot, m) => {
		const tag = m.arguments[0]?.toLowerCase()
		
		await m.reply({ react: { text: '⏳', key: m.key } }, false)
		
		var reply = {}
		try {
			reply = await Pics.random()
			reply = reply.endsWith('.gif')
			 ? {
				document: { url: reply },
				fileName: path.basename(reply),
				mimetype: 'image/gif',
				caption: 'Animated'
			} : {
				image: { url: reply}
			}
		} catch (err) {
			logger.info(reply)
			logger.warn(err),
			reply = { text: 'Not Found' }
		}
		const pn = jidDecode(m.senderPn)?.user
		await m.reply( {
			...{
				contextInfo: {
					mentionedJid: [m.sender]
				}
			},
			...reply
		}, true, reply.document ? null: {
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
		if(reply.video)
			setTimeout(()=> fs.unlinkSync(reply.video.url), 10000)
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}

const API_URL = {
	waifu_pics: 'https://api.waifu.pics',
	 n_sfw_com: 'https://api.n-sfw.com',
	  waifu_im: 'https://api.waifu.im',
	nekos_best: 'https://nekos.best/api/v2',
	    pic_re: 'https://pic.re/image',
}
const endpoints = {}

const Pics = {
	fetch (url) {
		return fetch(url).then(this.parseResponse)
	},
	endpoints (host) {
		if (host == 'pic_re')
			return {}
		return this.fetch(`${API_URL[host]}${host=='waifu_im'?'/tags':'/endpoints'}`)
	},
	proxy (url) {
		if (url.includes('n-sfw.com'))
			return 'https://proxy.n-sfw.com/?url='+url
		return url
	},
	randomize_host() {
		let host = Object.keys(API_URL)
		return [...host, ...host][Math.floor(Math.random() * (host.length * 2 -1))]
	},
	randomize_img_url (host) {
		var path = '', query = ''
		switch (host) {
			case 'pic_re':
			break
			case 'waifu_im':
				path = '/search'
				query = `?excluded_tags=oppai&height=<=2000&byte_size=<=2084000`
			break
			case 'waifu_pics':
			case 'n_sfw_com':
				path = endpoints[host].sfw
				path = [...path,...path][Math.floor(Math.random() * (path.length * 2 -1))]
				path = '/sfw/'+path
			break
			case 'nekos_best':
				path = Object.keys(endpoints[host])
				path = [...path,...path][Math.floor(Math.random() * (path.length * 2 -1))]
				path = '/'+path
			break
			default:
				host = 'https://picsum.photos/200'
		}
		host = API_URL[host] || host
		return {
			host, path, query,
			url:`${host}${path}${query}`
		}
	},
	async random() {
		const host = this.randomize_host()
		const request  = this.randomize_img_url(host)
		
		if(host == 'pic_re' || !API_URL[host])
			return request.url
		
		const response = await this.fetch(request.url)
		const proxy = host == 'n_sfw_com'? 'https://proxy.n-sfw.com/?url=' : ''
		
		return proxy + (response.url || response.results?.[0]?.url || response.images?.[0]?.url)
	},
	async parseResponse (response) {
		if (!response.ok) {
			const failure = await response.text()
	
			throw new Error(failure)
		}
	
		return response.json()
	},
	async load_endpoints() {
		var host = Object.keys(API_URL)
		for(host of host) try {
			endpoints[host] = await this.endpoints (host)
		} catch (e) {
			delete API_URL[host]
			logger.warn('Failed to get endpoints for '+host)
			logger.warn(e)
		}
		return endpoints
	}
}

Pics.load_endpoints()