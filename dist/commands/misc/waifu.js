import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';

import fs from 'fs';
import path from 'path';
import { v4 } from 'uuid';

import { jidDecode } from 'baileys';
import logger from '../../utils/logger.js';
//last_endpoints
var endpoints = {"sfw":["waifu","neko","shinobu","megumin","bully","cuddle","cry","hug","awoo","kiss","lick","pat","smug","bonk","yeet","blush","smile","wave","highfive","handhold","nom","bite","glomp","slap","kill","kick","happy","wink","poke","dance","cringe"]}

get_endpoints()

export const command = {
	command: 'waifu',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: 'Generator',
	description: 'waifu siapa ini?.',
	get help() {
		return 'usage:'
		+'\n`.waifu [tags]`, random waifu kamu.'
		+'\n`.waifu listtags`, daftar _tags_ tersedia.`'
	},
	handle: async (bot, m) => {
		const tag = m.arguments[0]?.toLowerCase()
		
		await m.reply({ react: { text: '⏳', key: m.key } }, false)
		
		var reply = {}
		if(tag == 'listtags') {
			reply = await get_endpoints()
			reply = '*Tags waifu*\n\n- '
			+ reply.sfw.join('\n- ')
			reply = { text: reply }
		} else
		try {
			reply = endpoints.sfw.includes(tag) ? tag : 'waifu'
			reply = await Waifu.fetch('/sfw/'+reply)
			reply = reply.url.endsWith('.gif')
			 ? {
				video: { url: await convertGifToMp4(reply.url) },
				gifPlayback: true
			} : {
				image: { url: reply.url}
			}
		} catch (err) {
			if(!reply.url)
				logger.warn(err),
				reply = { text: 'Not Found' }
			else
				reply = {
					document: { url: reply.url },
					fileName: path.basename(reply.url),
					mimetype: 'image/gif',
					caption: 'Animated'
				}
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

async function get_endpoints() {
	try {
		const res = await Waifu.endpoints()
		return endpoints = res
	} catch (err) {
		logger.warn(err)
		return endpoints
	}
}

const convertGifToMp4 = async (url) => {
	const response = await axios.get(url, { responseType: 'stream' });
	const gifStream = response.data;
	const uniqueFileName = `${v4()}.mp4`;
	const mp4Path = path.join(tmpDir, uniqueFileName);

	const videoBuffer = await new Promise((resolve, reject) => {
		ffmpeg(gifStream)
			.output(mp4Path)
			.outputFormat('mp4')
			.outputOptions([
				'-c:v libx264',
				'-crf 18',
				'-pix_fmt yuv420p',
			])
			.on('end', () => {
				resolve()
			})
			.on('error', (err) => {
				reject(err)
			})
			.run();
	})

	return mp4Path;
};

const API_URL = 'https://api.waifu.pics'

async function parseResponse (response) {
  if (!response.ok) {
    const failure = await response.text()

    throw new Error(failure)
  }

  return response.json()
}

const Waifu = {
  /**
   * @param {string} endpoint An endpoint contained in {@link https://waifu.pics/api/endpoints}
   * @returns {Promise}
   */
  fetch (endpoint) {
    return fetch(`${API_URL}${!endpoint.startsWith('/') ? `/${endpoint}` : endpoint}`).then(parseResponse)
  },

  /**
   * @returns {Promise<string[]>}
   */
  endpoints () {
    return this.fetch('/endpoints')
  }
}

get_endpoints()
async function get_endpoints() {
	try {
		const res = await Waifu.endpoints()
		return endpoints = res
	} catch (err) {
		logger.warn(err)
		return endpoints
	}
}

const tmpDir = path.resolve(process.cwd(),'tmp');

!async function main() {
	try {
		if (!fs.existsSync(tmpDir))
			fs.mkdirSync(tmpDir);
		else
			fs.rm(tmpDir, { recursive: true, force: true }, () => fs.mkdirSync(tmpDir))
	} catch (e) {
		logger.error(e)
	}
}()