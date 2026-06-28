import Session, { SessionManager, RulesManager } from '../../plugin/game/game_engine.js'
import addcmd from '../../utils/cmd_msg.js'

// Inisialisasi registry sekali saat pertama kali
const GAME_PREFIX = 'NME_games_'
const REGISTRY_PATH = './assets/games/source/rpg/rules_registry.json'
let registryInitialized = false

function initRegistry() {
	if (!registryInitialized) {
		RulesManager.loadRegistry(REGISTRY_PATH)
		registryInitialized = true
	}
}

// Helper untuk mendapatkan atau membuat session berdasarkan userId (m.sender)
async function getOrCreateSession(userId, gameTitle = null) {
	let session = SessionManager.getSession(userId)
	if (session) return session

	// Coba load dari db
	const sm = SessionManager.forUser(userId)
	const loadResult = await sm.load()
	if (loadResult.success) {
		return SessionManager.getSession(userId)
	}
	
	// Kalau tidak ada dan gameTitle diberikan, buat baru
	if (gameTitle) {
		session = Session.createNew(gameTitle, userId)
		SessionManager.setSession(userId, session)
		return session
	}
	return null
}

export const command = {
	command: 'rpg',
	tag: '03Game & Fun',
	description: 'Mainkan game RPG interaktif (D&D style)',
	help: `.rpg list - lihat daftar game tersedia
.rpg create <title> - mulai game baru (hapus sesi lama)
.rpg continue - lanjutkan game yang tersimpan
.rpg exit - hapus sesi aktif (tanpa menyimpan)
.rpg <jawaban> - berikan pilihan (angka/teks) saat game berjalan`,

	handle: async (bot, m) => {
		await m.reply({ react: { text: '🎲', key: m.key } }, false)
		
		try {
			initRegistry()
			
			const userId = GAME_PREFIX + m.sender
			
			const fullText = m.text?.trim() || ''
			const withoutCmd = fullText.replace(/^\.(rpg|dnd)/i, '').trim()
			const args = withoutCmd.split(/\s+/)
			const subCmd = args[0]?.toLowerCase() || ''
			const param = args.slice(1).join(' ')
			
			// --- Daftar game ---
			if (subCmd === 'list') {
				const games = RulesManager.listGames()
				if (!games.length) {
					await m.reply('Tidak ada game ditemukan di registry.')
				} else {
					let msg = '🎮 *Daftar Game RPG:*\n'
					games.forEach((g, i) => { msg += `${i+1}. ${g.title}\n` })
					await m.reply(msg)
				}
				await m.reply({ react: { text: '📋', key: m.key } }, false)
				return
			}
			
			// --- Create game baru ---
			if (subCmd === 'create') {
				if (!param) throw new Error('Masukkan judul game. Contoh: .rpg create "The Dark Forest"')
				// Cek apakah game title valid
				const gameConfig = RulesManager.getGameConfig(param)
				if (!gameConfig) {
					await m.reply(`Game "${param}" tidak ditemukan. Gunakan .rpg list untuk melihat daftar.`)
					return
				}
				
				// Hapus sesi lama jika ada
				const existing = SessionManager.getSession(userId)
				if (existing) {
					await m.reply('⚠️ Sesi lama akan dihapus dan diganti dengan game baru.')
					SessionManager.sessions.delete(userId)
					await SessionManager.forUser(userId).delete()
				}
				
				// Buat session baru
				const newSession = Session.createNew(param, userId)
				await m.reply(`Game *${param}* dimulai!\n\n${newSession._getNodeText(newSession.currentNode)}`, true, {quoted: bot.quoteContact(m)})
				await m.reply({ react: { text: '✨', key: m.key } }, false)
				return
			}
			
			// --- Lanjutkan game (continue / load) ---
			if (subCmd === 'continue' || subCmd === 'load') {
				const sm = SessionManager.forUser(userId)
				const loadResult = await sm.load()
				if (!loadResult.success) {
					await m.reply(`❌ ${loadResult.message}\nGunakan .rpg create <title> untuk memulai baru.`)
				} else {
					const session = SessionManager.getSession(userId)
					await m.reply(`📀 *Game dimuat!*\n\n${session._getNodeText(session.currentNode)}`, true, {quoted: bot.quoteContact(m)})
				}
				await m.reply({ react: { text: '📀', key: m.key } }, false)
				return
			}
			
			// --- Hapus sesi (exit / close) ---
			if (subCmd === 'exit' || subCmd === 'close') {
				const session = SessionManager.getSession(userId)
				if (session) {
					SessionManager.sessions.delete(userId)
					await SessionManager.forUser(userId).delete()
					await m.reply('🚪 Game dihentikan dan sesi dihapus. Progress tidak disimpan.')
				} else {
					await m.reply('Tidak ada game aktif untuk dihentikan.')
				}
				return
			}
			
			// --- Jika tidak ada sub command, cek apakah sedang dalam game ---
			let activeSession = SessionManager.getSession(userId)
			if (!activeSession) {
				// Coba load dari db
				const sm = SessionManager.forUser(userId)
				const loadResult = await sm.load()
				if (loadResult.success) {
					activeSession = SessionManager.getSession(userId)
				} else {
					// Tidak ada game sama sekali
					await m.reply(`🎲 *Game RPG*\nKamu belum memulai atau melanjutkan game.\nGunakan:\n.rpg list - lihat game tersedia\n.rpg create <title> - mulai baru\n.rpg continue - lanjutkan simpanan`)
					await m.reply({ react: { text: '❓', key: m.key } }, false)
					return
				}
			}
			
			// --- Jika ada input (angka/teks) untuk game aktif ---
			if (subCmd !== '' || param !== '') {
				// Input user adalah gabungan subCmd + param jika subCmd bukan perintah reserved
				let userInput = withoutCmd // seluruh teks setelah .rpg
				if (subCmd === 'continue' || subCmd === 'load' || subCmd === 'create' || subCmd === 'exit' || subCmd === 'list') {
					// sudah ditangani di atas, tidak akan sampai sini
					return
				}
				// Proses input ke engine
				const response = await activeSession.processInput(userInput)
				await m.reply(response)
				
				// Jika game over, hapus session dari memory (tetap simpan ke db? engine sudah set gameOver)
				if (activeSession.gameOver) {
					activeSession.delete()
					await m.reply('\n💾 Game selesai. Ketik .rpg create untuk bermain lagi.')
				} else {
					// Auto save setelah setiap action (opsional)
					await SessionManager.forUser(userId).autoSave()
				}
				await m.reply({ react: { text: '⚡', key: m.key } }, false)
				return
			}
			
			// Jika hanya .rpg tanpa argumen dan game aktif, tampilkan node saat ini
			await m.reply(activeSession._getNodeText(activeSession.currentNode), true, {quoted: bot.quoteContact(m)})
			await m.reply({ react: { text: '🔄', key: m.key } }, false)
			
		} catch (error) {
			if (global.devMode) console.error('[RPG]', error)
			await m.reply(`❌ Error: ${error.message}`)
			await m.reply({ react: { text: '⚠️', key: m.key } }, false)
		}
	}
}

addcmd(
	'dnd',
	command.handle,
	{
		...command
	}
)