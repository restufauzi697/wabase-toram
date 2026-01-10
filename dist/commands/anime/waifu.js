import path from 'path';
import logger from '../../utils/logger.js';

class Gacha {
	constructor(items) {
		this.items = items;
		this.totalPercent = items.reduce((acc, item) => acc + item.percent, 0);
	}

	draw() {
		const random = Math.random() * this.totalPercent;
		let cumulativePercent = 0;

		for (const item of this.items) {
			cumulativePercent += item.percent;
			if (random <= cumulativePercent) {
				return item;
			}
		}
	}

	addItem(item) {
		this.items.push(item);
		this.totalPercent += item.percent;
	}

	removeItem(itemName) {
		const index = this.items.findIndex(item => item.name === itemName);
		if (index !== -1) {
			this.totalPercent -= this.items[index].percent;
			this.items.splice(index, 1);
		}
	}
}

const _rep = ['not found.', 'tidak ditemukan.', 'Error: 500']

export const command = {
	command: 'waifu',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: 'Anime',
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
			if(!reply)
				throw new Error('gagal mendapatkan img waifu!')
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
			reply = {
				image: { url: 'https://pic.re/image'},
				caption: 'anime™'
			}
		}
		await m.reply({ react: { text: '🏷️', key: m.key } }, false)
		try {
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
				quoted: bot.quoteContact(m)
			})
		} catch(e) {
			await m.reply(_rep[Math.floor(Math.random()*_rep.length)]||'')
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}

const API_URL = {
	 waifu_pics: 'https://api.waifu.pics',
	//  n_sfw_com: 'https://api.n-sfw.com',
	   waifu_im: 'https://api.waifu.im',
	 nekos_best: 'https://nekos.best/api/v2',
	nekosia_cat: 'https://api.nekosia.cat/api/v1',
	//     pic_re: 'https://pic.re/image',
}

const tags = new Gacha([
	{ name: 'shinobu', percent: 10, host: new Gacha(arr2i(['waifu_pics'            ])) },
	{ name: 'megumin', percent: 15, host: new Gacha(arr2i(['waifu_pics'            ])) },
	{ name: 'waifu',   percent: 50, host: new Gacha(arr2i([{n:'waifu_pics',p:40}, {n:'waifu_im',p:40}, {n:'nekos_best',p:20}])) },
	{ name: 'oppai',   percent: 40, host: new Gacha(arr2i([              'waifu_im'              ])) },
	{ name: 'neko',    percent: 20, host: new Gacha(arr2i(['waifu_pics',             'nekos_best', 'nekosia_cat'])) },
	{ name: 'maid',    percent: 20, host: new Gacha(arr2i([              'waifu_im'])) },
	{ name: 'kitsune', percent: 20, host: new Gacha(arr2i([                          'nekos_best'])) },
])

const Pics = {
	fetch (url) {
		return fetch(url).then(this.parseResponse)
	},
	endpoints (host) {
		if (host == 'pic_re' || host == 'nekosia_cat' || host == 'waifu_pics' || host == 'waifu_im')
			return {}
		return this.fetch(`${API_URL[host]}${host=='waifu_im'?'/tags':'/endpoints'}`)
	},
	proxy (url) {
		if (url.includes('n-sfw.com'))
			return 'https://proxy.n-sfw.com/?url='+url
		return url
	},
	randomize_host() {
		let tag = tags.draw()
		return {
			endpoints: tag.name,
			host: tag.host.draw().name
		}
	},
	request_img_url ({ host, endpoints }) {
		var path = '', query = ''
		switch (host) {
			case 'nekosia_cat':
				path = '/images/random'
			break
			case 'waifu_im':
				path = '/search'
				query = `?included_tags=${endpoints}&height=<=2048&byte_size=<=2084000&gif=false`
			break
			case 'waifu_pics':
				path += '/sfw'
			case 'nekos_best':
				path += '/'+endpoints
			break
			default:
				logger.warn({ host, endpoints })
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
		const request  = this.request_img_url(host)
		
		if(host.host == 'pic_re' || !API_URL[host.host])
			return request.url
		
		const response = await this.fetch(request.url).catch(a=>logger.warn(request))
		const proxy = host.host == 'n_sfw_com'? 'https://proxy.n-sfw.com/?url=' : ''
		
		return proxy + (response.url || response.results?.[0]?.url || response.images?.[0]?.url || response.image?.compressed?.url || response.images?.[0]?.image?.compressed?.url)
	},
	async parseResponse (response) {
		if (!response.ok) {
			const failure = await response.text()
	
			throw new Error(failure)
		}
	
		return response.json()
	}
}

function arr2i (arr) {
	return arr.map(i =>
		({ name: i.n||i,   percent: i.p||Math.round(100 / arr.length)})
	)
}

