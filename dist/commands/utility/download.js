import axios from 'axios'
import { basename } from 'path'
import logger from '../../utils/logger.js'

const extractLink = s => /https?:\/\/[^\s/$.?#].[^\s]*/i.exec(s)?.[0]

const download = async (link, ops = {}) => {
  const r = await axios.get(link, { responseType: 'arraybuffer',...ops })
  const d = r.headers['content-disposition']
  const m = d?.match(/filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i)
  const n = m? decodeURIComponent(m[1]) : basename(new URL(link).pathname) || 'file.bin'
  return {
    document: Buffer.from(r.data),
    fileName: n,
    mimetype: r.headers['content-type']?.split(';')[0] || 'application/octet-stream'
  }
}

export const command = {
	command: 'download',
	tag: 'Utilitas',
	description: 'unduh file dari link',
	help: 'usage: .download <link>',
	handle: async (bot, m) => {
		const q = extractLink(m.text)
		if( !q )
			return m.reply('Gunakan `.download <link>` pastikan link sudah benar')
		
		await m.reply({ react: { text: '🌐', key: m.key } }, false)
		try {
			const r = await download( q )
			
			await m.reply(r)
		} catch ({code,status}) {
			if (global.devMode) logger.error(`Status: ${status}/${code}`);
			await m.reply(`Status: ${status}/${code}`);
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}
