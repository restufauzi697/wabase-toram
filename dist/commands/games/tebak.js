import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import db from '../../utils/session/db.js'
import addcmd from '../../utils/cmd_msg.js'
import logger from '../../utils/logger.js'

// In-memory cache untuk data JSON (bisa tetap, karena read-only)
let qaData = null
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const qaPath = resolve(__dirname, '../../../assets/games/source/question.json')
try {
	const raw = readFileSync(qaPath, 'utf-8')
	qaData = JSON.parse(raw)
} catch (err) {
	console.error('Failed to load qa.json:', err)
}

// Helper: kunci sesi aktif (berbeda per chat)
function getSessionKey(chatId, senderId) {
	return `game_tebak_session:${chatId}_${senderId}`
}

// Helper: kunci total poin user
function getUserPointsKey(senderId) {
	return `game_tebak_user_points:${senderId}`
}

let questionPools = {};

// Ambil pertanyaan acak
function getRandomQuestion(filter) {
	if (!qaData?.questions?.length) return null

	let filterArray = [];
	if (filter) {
		filterArray = Array.isArray(filter)? filter : [filter];
		filterArray = filterArray.map(t => t.toLowerCase());
	}

	const filterKey = JSON.stringify(filterArray);

	// Kalau pool untuk filter ini belum ada, bikin baru
	if (!questionPools[filterKey] || questionPools[filterKey].length === 0) {

		const availableIndexes = qaData.questions
			.map((q, i) => ({...q, i }))
			.filter(q => filterArray.length === 0 || filterArray.includes(q.theme.toLowerCase()))
			.map(q => q.i);

		if (availableIndexes.length === 0) return null;

		// Shuffle Fisher-Yates
		questionPools[filterKey] = [...availableIndexes];
		for (let i = questionPools[filterKey].length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[questionPools[filterKey][i], questionPools[filterKey][j]] =
			[questionPools[filterKey][j], questionPools[filterKey][i]];
		}
		questionPools[filterKey] = questionPools[filterKey].slice(0,100).sort((a,b) => qaData.questions[b].level-qaData.questions[b].level)
	}

	// Ambil 1 soal
	const index = questionPools[filterKey].pop();
	return {...qaData.questions[index], index };
}

// Buat reset pool
function resetQuestions(filter = null) {
	if (filter) { // Reset pool spesifik
		const filterArray = Array.isArray(filter)? filter : [filter];
		const filterKey = JSON.stringify(filterArray.map(t => t.toLowerCase()));
		delete questionPools[filterKey];
	} else
	// Reset semua pool
		questionPools = {};
}

// Cek jawaban
function isAnswerCorrect(userAnswer, options) {
	const normalizedUser = userAnswer.trim().toLowerCase()
	// Jika jawaban angka (1,2,3...)
	if (/^\d+$/.test(normalizedUser)) {
		const idx = parseInt(normalizedUser, 10) - 1
		if (idx >= 0 && idx < options.length) {
			return options[idx].correct === true
		}
		return false
	}
	// Jika jawaban huruf (a,b,c,d...)
	if (/^[a-e]$/.test(normalizedUser)) {
		const idx = 'abcde'.search(normalizedUser)
		if (idx >= 0 && idx < options.length) {
			return options[idx].correct === true
		}
		return false
	}
	// Cari opsi yang benar
	const correctOption = options.find(opt => opt.correct === true)
	if (!correctOption) return false
	const normalizedCorrect = correctOption.answer.trim().toLowerCase()
	return normalizedUser === normalizedCorrect || normalizedUser.includes(normalizedCorrect)
}

// Format pertanyaan
function formatQuestion(questionObj, showManifest = false) {
	let text = ''
	if (showManifest && qaData?.manifest) {
		text += `🎮 *${qaData.manifest.name}* v${qaData.manifest.version}\n`
		text += `📝 ${qaData.manifest.description}\n\n`
	}
	text += `❓ *Level ${questionObj.level}* : ${questionObj.question}\n\n`
	text += `📌 Pilihan:\n`
	const pilihan = 'ABCDE'
	questionObj.options.forEach((opt, idx) => {
		text += `- ${pilihan[idx]}. ${opt.answer.replace(/KEY:(\([^)]+\))/g, '')}\n`
	})
	text += `\nKetik jawaban (teks/ABC) atau .tebak stop untuk berhenti.`
	return text
}

export const command = {
	command: 'tebak',
	label: 'tebak, receh dan peengetahuan',
	tag: '03Game & Fun',
	description: 'Game tebak-tebakan interaktif (per grup)',
	help: `.tebak - mulai game baru\n.tebak <jawaban> - menjawab\n.tebak skor - lihat total poin & skor game berjalan\n.tebak stop - berhenti & simpan poin`,
	handle: async (bot, m) => {
		await m.reply({ react: { text: '🤔', key: m.key } }, false)

		try {
			if (!qaData) throw new Error('Data game tidak tersedia. Hubungi admin.')

			const chatId = m.chat
			const senderId = m.sender
			if (!chatId || !senderId) throw new Error('Tidak dapat identifikasi chat/user.')

			const sessionKey = getSessionKey(chatId, senderId)
			const pointsKey = getUserPointsKey(senderId)

			// Ambil teks perintah
			const fullText = m.text || ''
			const cmd = m.command
			const withoutCmd = fullText.replace(/^\S*\b/, '').trim()
			const args = withoutCmd.split(/\s+/)
			const subCommand = args[0]?.toLowerCase() || ''
			const userAnswer = args.join(' ') // untuk jawaban multi-kata

			// filter trivia
			let filter
			if (/trivia|tv/i.test(cmd))
				filter = [senderId,'ipa', 'ips', 'mtk', 'matematika', 'inggris', 'trivia']
			else if ('lontong' == cmd)
				filter = [senderId,'lontong']
			else
				filter = [senderId,'seru', 'fun']
				

			// --- Perintah stop ---
			if (subCommand === 'stop') {
				const session = await db.get(sessionKey)
				if (session) {
					// Tambahkan poin sementara ke total poin user
					const currentPoints = (await db.get(pointsKey)) || 0
					await db.save(pointsKey, currentPoints + (session.score || 0))
					await db.remove(sessionKey)
					await m.reply(`🛑 Game dihentikan. Poin game ini (${session.score || 0}) telah ditambahkan ke total poinmu.\nTotal poin sekarang: *${currentPoints + session.score}*`)
				} else {
					await m.reply('Tidak ada game aktif untuk dihentikan.')
				}
				await m.reply({ react: { text: '', key: m.key } }, false)
				return
			}

			// --- Perintah skor ---
			if (subCommand === 'skor') {
				const totalPoints = (await db.get(pointsKey)) || 0
				const session = await db.get(sessionKey)
				let msg = `🏆 *Total poin kamu:* ${totalPoints}`
				if (session) {
					msg += `\n🎯 *Skor game berjalan:* ${session.score} poin`
				} else {
					msg += `\n⚠️ Tidak ada game aktif. Ketik .${cmd} untuk memulai.`
				}
				await m.reply(msg, true, {quoted: bot.quoteContact(m)})
				await m.reply({ react: { text: '', key: m.key } }, false)
				return
			}

			// --- Perintah acak ---
			if (/acak|suffle|reset/.test(subCommand)) {
				resetQuestions(subCommand === 'reset' ? null : filter)
				return
			}

			// --- Ambil atau buat sesi game ---
			let session = await db.get(sessionKey)

			// Jika tidak ada sesi, buat baru
			if (!session) {
				const randomQ = getRandomQuestion(filter)
				if (!randomQ) throw new Error('Tidak ada pertanyaan dalam database.')
				session = {
					currentQuestion: randomQ,
					score: 0,
				}
				await db.save(sessionKey, session)
				await m.reply(formatQuestion(randomQ, true)) // tampilkan manifest di awal
				await m.reply({ react: { text: '🎲', key: m.key } }, false)
				return
			}

			// --- Jika ada jawaban (game berjalan) ---
			if (userAnswer) {
				const currentQ = session.currentQuestion
				const correct = isAnswerCorrect(userAnswer, currentQ.options)

				if (correct) {
					const pointsGained = currentQ.level * 10
					session.score += pointsGained
					await db.save(sessionKey, session)
					await m.reply(`*BENAR!* +${pointsGained} poin.\nSkor game ini: *${session.score}*`)

					// Ambil pertanyaan berikutnya
					const nextQ = getRandomQuestion(filter)
					if (!nextQ) {
						// Tidak ada soal lagi -> game selesai, tambahkan ke total poin
						const totalPoints = (await db.get(pointsKey)) || 0
						await db.save(pointsKey, totalPoints + session.score)
						await db.remove(sessionKey)
						await m.reply(`🏁 *Selamat!* Kamu telah menyelesaikan semua pertanyaan.\nSkor akhir game ini: ${session.score}\nTotal poinmu sekarang: ${totalPoints + session.score}\nKetik .${cmd} untuk bermain lagi.`)
						await m.reply({ react: { text: '🏆', key: m.key } }, false)
					} else {
						session.currentQuestion = nextQ
						await db.save(sessionKey, session)
						await m.reply(formatQuestion(nextQ), true, {quoted: bot.quoteContact(m)})
					}
					await m.reply({ react: { text: '', key: m.key } }, false)
				} else {
					// Jawaban salah -> game over, tambahkan poin ke total
					const correctOption = currentQ.options.find(opt => opt.correct === true)
					const correctAnswerText = correctOption ? correctOption.answer : 'Tidak diketahui'
					const totalPoints = (await db.get(pointsKey)) || 0
					const newTotal = totalPoints + session.score
					await db.save(pointsKey, newTotal)
					await db.remove(sessionKey)
					await m.reply(`*SALAH!* Jawaban yang benar: *${correctAnswerText.replace(/KEY:(\([^)]+\))/g, '$1')}*.\nGame over! Skor game ini: *${session.score}* poin.\nTotal poinmu sekarang: *${newTotal}*\nKetik .${cmd} untuk mulai baru.`)
					await m.reply({ react: { text: '', key: m.key } }, false)
				}
				return
			}

			// --- Jika hanya .tebak tanpa argumen dan game sudah ada ---
			await m.reply(formatQuestion(session.currentQuestion), true, {quoted: bot.quoteContact(m)})
			await m.reply({ react: { text: '🔄', key: m.key } }, false)
		} catch (error) {
			logger.error(error, 'Game tebak error:')
			await m.reply({ react: { text: '😵‍💫', key: m.key } }, false)
		}
	},
}

addcmd(
	'jwb',
	command.handle,
	{
		...command,
		visible: false
	}
)
addcmd(
	'tb',
	command.handle,
	{
		...command,
		visible: false
	}
)
addcmd(
	'trivia',
	command.handle,
	{
		...command,
		label: 'IPA/S / MTK / ENG',
		visible: true,
		help: command.help.replace(/\.tebak/g, '.tv')
	}
)
addcmd(
	'lontong',
	command.handle,
	{
		...command,
		label: 'Cak Lontong',
		visible: true,
		help: command.help.replace(/\.tebak/g, '.tv')
	}
)
addcmd(
	'tv',
	command.handle,
	{
		...command,
		visible: false,
		help: command.help.replace(/\.tebak/g, '.tv')
	}
)