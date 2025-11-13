import fs from 'fs'
import AdmZip from 'adm-zip'
import { getContentType, downloadContentFromMessage } from "baileys";
import {command as cmd} from './restart.js'

let ant = 0

export const command = {
	command: 'setting',
	onlyOwner: true,
	onlyPremium: false,
	onlyGroup: false,
	visible: false,
	tag: 'server',
	description: 'Pengaturan.',
	get help() {
		return `usage: 
.setting <get|set>,<key>,<value>
.setting backup
.setting restore //with file
send or quote file zip to restore settings.`
	},
	handle: async (bot, m) => {
		if(ant>0)
			return
		ant ++
		try {
			const [action,key,...value] = m.arguments
			
			const setting = global.setting
			
			if (action == 'get')
				await m.reply(`${key}: ${setting[key]}`)
			if (action == 'set') {
				setting[key] = value.join(',')
				global.saveSetting()
				await m.reply('Pengaturan disimpan')
			}
			if (action == 'backup') {
				const zip = new AdmZip();
				
				zip.addLocalFolder('./database', 'database');
				zip.addLocalFile('./setting.json');
				
				const zipBuffer = zip.toBuffer();
				
				await m.reply({
					document: zipBuffer,
					fileName: 'backup.zip',
					mimetype: 'application/zip'
				})
			}
			if (action == 'restore') {
				const message = m.isQuote ? m.quote : m.message
				
				if (getContentType(message) == 'documentMessage') {
					const document = message.documentMessage
					const mimeType = document.mimetype
					
					if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') {
						const buffer = await downloadContentFromMessage(document, 'document');
						
						let media = Buffer.from([])
						for await (const chunk of buffer)
							media = Buffer.concat([media, chunk])
						
						const zip = new AdmZip(media);
						const zipEntries = zip.getEntries();
						
						const hasDatabase = zipEntries.some(entry => entry.entryName.startsWith('database/'));
						const hasSettingJson = zipEntries.some(entry => entry.entryName === 'setting.json');
						
						if (hasDatabase && hasSettingJson) {
							zip.extractEntryTo('database/', './database', false, true);
							zip.extractEntryTo('setting.json', '.', false, true);
							
							await m.reply('Restore selesai')
							cmd.handle(bot, m)
						} else await m.reply('Restore dibatalkan')
					} else await m.reply('Format tidak didukung')
				} else await m.reply('File backup dibutuhkan untuk restore')
			}
		} catch(e) {
			await m.reply(e.message)
		}
		ant --
	},
}