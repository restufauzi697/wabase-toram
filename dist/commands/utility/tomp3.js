import { downloadContentFromMessage, getContentType } from 'baileys'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { randomBytes } from 'crypto'
import logger from '../../utils/logger.js'

/**
 * Convert media from URL or local file to MP3 buffer
 * @param {string} input - URL or file path
 * @param {object} ops - options (not used currently)
 * @returns {Promise<{document: Buffer, fileName: string, mimetype: string}>}
 */
async function toMp3(input, ops = {}) {
	const tempDir = os.tmpdir()
	const inputId = randomBytes(8).toString('hex')
	const outputId = randomBytes(8).toString('hex')
	const inputPath = path.join(tempDir, `${inputId}.input`)
	const outputPath = path.join(tempDir, `${outputId}.mp3`)

	// If input is a URL, download it first
	if (input.startsWith('http://') || input.startsWith('https://')) {
		const response = await fetch(input)
		const buffer = Buffer.from(await response.arrayBuffer())
		await fs.writeFile(inputPath, buffer)
	} else {
		// Assume it's a local file path
		await fs.copyFile(input, inputPath)
	}

	// Convert to MP3 using ffmpeg
	await new Promise((resolve, reject) => {
		ffmpeg(inputPath)
			.toFormat('mp3')
			.audioBitrate(128)
			.on('end', () => resolve())
			.on('error', (err) => reject(err))
			.save(outputPath)
	})

	// Read the converted file
	const buffer = await fs.readFile(outputPath)
	const fileName = `${inputId}.mp3`

	// Cleanup temp files
	await fs.unlink(inputPath).catch(() => {})
	await fs.unlink(outputPath).catch(() => {})

	return {
		audio: buffer,
		fileName: fileName,
		mimetype: 'audio/mpeg'
	}
}

export const command = {
	command: 'tomp3',
	tag: 'Utilitas',
	description: 'convert music dan video jadi mp3',
	help: 'usage: `.tomp3` dengan media atau kutip pesan media',
	handle: async (bot, m) => {
		await m.reply({ react: { text: '🏷️', key: m.key } }, false)
		try {
			// Determine the media message
			// If quoting another message, extract the quoted media
			const mediaMsg = m.isQuote ? m.quote : m.message

			// Get the media type and download function
			const contentType = getContentType(mediaMsg)
			
			if (!['videoMessage', 'audioMessage', 'documentMessage'].includes(contentType)) {
				throw new Error('Tidak ada media yang ditemukan. Balas pesan video/audio atau kirim media.')
			}

			const media = mediaMsg[contentType]
			const stream = await downloadContentFromMessage(media, contentType.replace('Message', ''))
			let buffer = Buffer.from([])
			for await (const chunk of stream) {
				buffer = Buffer.concat([buffer, chunk])
			}

			// Save to temp file before conversion
			const tempDir = os.tmpdir()
			const tempInput = path.join(tempDir, `${randomBytes(8).toString('hex')}.${media.mimetype.split('/')[1] || 'bin'}`)
			await fs.writeFile(tempInput, buffer)

			// Convert to MP3
			const result = await toMp3(tempInput)

			// Cleanup the original temp file
			await fs.unlink(tempInput).catch(() => {})

			// Send as document
			await m.reply({
				...result,
				caption: '✅ Konversi selesai!'
			})
		} catch (error) {
			if (global.devMode) logger.error(error, 'tomp3')
			await m.reply({ text: `❌ Gagal mengkonversi: ${error.message}` })
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}