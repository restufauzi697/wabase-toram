import { jidDecode } from 'baileys';
import yt from '@vreden/youtube_scraper'
import addcmd from '../../utils/cmd_msg.js'
import logger from '../../utils/logger.js';

export const command = {
	command: 'ytd',
	onlyOwner: false,
	onlyGroup: false,
	tag: 'Utilitas',
	description: 'Unduh video/music dari youtube.',
	help: 'usage: .ytd <link> [format] [quality]\n format: mp3/mp4 (default: mp4)\nquality:\n- mp3 92, 128, 256, or 320 kbps (default: 128)\n- mp4 144p, 360p, 480p, 720p, or 1080p (default: 360p)',
	handle,
}

addcmd(
	'ytm',
	handle,
	{
		tag: 'Utilitas',
		description: 'Unduh music dari youtube.',
		help: `usage: .ytm <link> [quality]\nquality: mp3 92, 128, 256, or 320 kbps (default: 128)`
	}
)

addcmd(
	'ytv',
	handle,
	{
		tag: 'Utilitas',
		description: 'Unduh video dari youtube.',
		help: `usage: .ytv <link> [quality]\nquality: mp4 144p, 360p, 480p, 720p, or 1080p (default: 360p)`
	}
)
const _type = { mp4:'\u{1F3AC}', mp3:'\u{1F3B5}' }
const _mchn = { ytm:'mp3', ytv:'mp4'}
async function handle (bot, m) {
	var [link, format, quality] = m.arguments[0]?.split(' ')
	
	if (!link)
		return await m.reply(`usage: \`.help ${m.command}\` for help.`);
	
	if (m.command != 'ytd')
		quality = format,
		format = _mchn[m.command]
	else 
		format ||= 'mp4'
	
	if ( !_type[format])
		return await m.reply(`(${format}) format tidak didukung.`);
	
	if (job>2)
		return await m.reply('\u{1F4DA}\u{1FAE0} Tugas ku sedang menumpuk...')
	
	await m.reply({ react: { text: _type[format], key: m.key } }, false)
	try {
		const pn = jidDecode(m.senderPn)?.user
		await m.reply( await unduh (link, format||'mp4', parseInt(quality) || (format=='mp4'?360:128)), true, {
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
		} )
	} catch (e) {
		logger.error(e)
	}
	await m.reply({ react: { text: '', key: m.key } }, false)
}

var job = 0
async function unduh (link, format='mp4', quality=360) {
	  ++job
	const r = await yt['yt'+format] (link, quality)
	  --job
	if (!r.status)
		return {text: r.message}
	if (format == 'mp4')
		return {
			caption:`\u{1F3AC} ${ r.metadata.views } views | ${ r.metadata.title } (${ r.metadata.timestamp }) | by ${ r.metadata.author.name } \u{1F3B5}`,
			video: { url: r.download.url },
			mimetype: 'video/mp4',
			fileName: r.download.filename
		}
	if (format == 'mp3')
		return {
			audio: { url: r.download.url},
			mimetype: 'audio/mpeg',
			fileName: r.download.filename
		}
}