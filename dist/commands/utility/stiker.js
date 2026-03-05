import { downloadContentFromMessage, getContentType } from 'baileys'
import * as fs from 'fs'
import * as path from 'path'
import * as  crypto from 'crypto'
import ffmpeg from 'fluent-ffmpeg'
import webp from 'node-webpmux'
import logger from '../../utils/logger.js'
import addcmd from '../../utils/cmd_msg.js'

/**
 * Add WhatsApp JSON Exif Metadata
 * Taken from https://github.com/pedroslopez/whatsapp-web.js/pull/527/files
 * @param {Buffer} webpSticker 
 * @param {String} packname 
 * @param {String} author 
 * @param {String} categories 
 * @param {Object} extra 
 * @returns 
 */
async function addExif(webpSticker, packname, author, categories = [], extra = {}) {
	const img = new webp.Image();
	const stickerPackId = crypto.randomBytes(32).toString('hex');
	const json = { 'sticker-pack-id': stickerPackId, 'sticker-pack-name': packname, 'sticker-pack-publisher': author, 'emojis': categories, ...extra };
	let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
	let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
	let exif = Buffer.concat([exifAttr, jsonBuffer]);
	exif.writeUIntLE(jsonBuffer.length, 14, 4);
	await img.load(webpSticker)
	img.exif = exif
	return await img.save(null)
}

async function image2webp(media) { 
	const tmpFileOut = path.join('./tmp', `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
	const tmpFileIn = path.join('./tmp', `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpeg`)
	fs.writeFileSync(tmpFileIn, media)
	await new Promise((resolve, reject) => {
		ffmpeg(tmpFileIn)
		.on("error", reject)
		.on("end", () => resolve(true))
		.addOutputOptions([
			'-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1'
		])
		.toFormat("webp")
		.save(tmpFileOut)
	})
	const buff = fs.readFileSync(tmpFileOut)
	fs.unlinkSync(tmpFileOut)
	fs.unlinkSync(tmpFileIn)
	return buff
}

async function video2webp(media, fps = 15) { 
	const tmpFileOut = path.join('./tmp', `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
	const tmpFileIn = path.join('./tmp', `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`)
	fs.writeFileSync(tmpFileIn, media)
	await new Promise((resolve, reject) => {
		ffmpeg(tmpFileIn)
		.on("error", reject)
		.on("end", () => resolve(true))
		.addOutputOptions([
			"-vcodec", "libwebp",
			"-vf",     `scale='min(320,512)':min'(320,512)':force_original_aspect_ratio=decrease,fps=${fps}, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`,
			"-loop",   "0",
			"-ss",     "00:00:00",
			"-t",      "00:00:05",
			"-preset", "default",
			"-an",
			"-vsync",  "0"
		])
		.toFormat("webp")
		.save(tmpFileOut)
	})
	const buff = fs.readFileSync(tmpFileOut)
	fs.unlinkSync(tmpFileOut)
	fs.unlinkSync(tmpFileIn)
	return buff
}

const command = {
	command: 'stiker',
	tag: 'Tools',
	description: 'Buat stiker dari gambar atau video',
	get help() {
		return 'usage: `.stiker` dengan media atau kutip pesan media.'
	},
	handle: async (bot, m) => {
		try {
			const msg = m.isQuote ? m.quote : m.message
			const msgType = getContentType(msg)
			const type = msgType.match(/(image|video)/)?.[1]
			if (type) {
				await m.reply({ react: { text: '🏷️', key: m.key } }, false)
				
				const stream = await downloadContentFromMessage(msg[msgType], type)
				const bufferArray = []
				for await (const chunk of stream)
					bufferArray.push(chunk)
				const buffer = Buffer.concat(bufferArray)
				let sticker = await [video2webp, image2webp][(type == 'image')|0](buffer)
				let packname = global.bot.name, author = 'Yuki', categories = []
				try {
					m.text.replace(/(pk|pack|packname|au|auth|author|ct|ctg|category|categories):\s*([^\n]*)$/gmi, (_,key,val) => {
						if(/pk|pack|packname/.test(key))
							packname = val.trim()
						else if(/au|auth|author/.test(key))
							author = val.trim()
						else if(/ct|ctg|category|categories/.test(key))
							categories = val.match(/(?:\p{Extended_Pictographic}[\p{Emoji_Modifier}\p{M}]*(?:\p{Join_Control}\p{Extended_Pictographic}[\p{Emoji_Modifier}\p{M}]*)*|\s|.)\p{M}*/guy) || []
						return ''
					})
					sticker = await addExif(sticker, packname, author, categories, {})
				} catch (e) {
					logger.warn(e)
				}
				
				await m.reply({ sticker, packname, author })
			} else
				await m.reply('Media gambar/video diperlukan.')
		} catch (e) {
			logger.error(e)
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	}
};

function AddCmd() {
	addcmd(
		command.command,
		command.handle,
		{
			...command
		}
	)
}

/*
!async function(){
	try {
		const ffmpegPath = (import('@ffmpeg-installer/ffmpeg')).default
		ffmpeg.setFfmpegPath(ffmpegPath.path);
		AddCmd()
	} catch(e) {
		logger.warn('install filed: ffmpeg')
		logger.info('try test compability: ffmpeg')
		try {
			const inputPath = './assets/toram/texture/rf_acme.jpg'
			const outputPath = './assets/toram/texture/rf_acme.webp'
		
			await new Promise((resolve, reject) => {
				ffmpeg(inputPath)
				.on("error", reject)
				.on("end", () => resolve(true))
				.addOutputOptions([
					'-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1'
				])
				.toFormat("webp")
				.save(outputPath)
			})
			AddCmd()
		} catch(e) {
			logger.warn(e)
		}
	}
}()
*/

ffmpeg.getAvailableFormats((err, version) => {
  if (err) {
    try {
		const ffmpegPath = (import('@ffmpeg-installer/ffmpeg')).default
		ffmpeg.setFfmpegPath(ffmpegPath.path);
	} catch(e) {
		logger.warn("can't install ffmpeg. you can try to install manualy.")
		return
	}
  }
  AddCmd()
});
