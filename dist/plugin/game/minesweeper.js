// dist/plugin/game/minesweeper.js
import logger from '../../utils/logger.js';
import db from '../../utils/session/db.js';

// Game state storage (in-memory cache, keyed by sender ID)
const games = new Map();

const game_thumbnail = './assets/games/banner/bomb.jpg';
const __adsURL = bot.adsUrl+'/mw';

// Level definitions
const LEVELS = {
	easy:	 { width: 5, height: 5, mines: 5 },
	medium: { width: 8, height: 8, mines: 12 },
	hard:	 { width: 10, height: 10, mines: 20 }
};

// Emoji mappings
const NUM_EMOJI = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const ROW_PREFIX = '⏺️';
const CORNER = '⏹️';
const HIDDEN = '🟪';
const FLAG = '🚩';
const BOMB = '💣';

const MAX_GAME_TIME = 5 * 60 * 1000; // 5 minutes

// Helper: convert number to emoji digit (0-10)
function toEmojiNum(n) {
	if (n >= 0 && n <= 10) return NUM_EMOJI[n];
	return NUM_EMOJI[0];
}

// Helper: format time mm:ss
function formatTime(ms) {
	const totalSec = Math.floor(ms / 1000);
	const mins = Math.floor(totalSec / 60);
	const secs = totalSec % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Generate board with mines placed randomly (excluding first click cell)
function generateBoard(width, height, mines, excludeRow, excludeCol) {
	const board = Array(height).fill().map(() => Array(width).fill().map(() => ({
		isMine: false,
		revealed: false,
		flag: false,
		neighborMines: 0
	})));

	let minesPlaced = 0;
	while (minesPlaced < mines) {
		const row = Math.floor(Math.random() * height);
		const col = Math.floor(Math.random() * width);
		if (!board[row][col].isMine && !(row === excludeRow && col === excludeCol)) {
			board[row][col].isMine = true;
			minesPlaced++;
		}
	}

	for (let r = 0; r < height; r++) {
		for (let c = 0; c < width; c++) {
			if (board[r][c].isMine) continue;
			let count = 0;
			for (let dr = -1; dr <= 1; dr++) {
				for (let dc = -1; dc <= 1; dc++) {
					const nr = r + dr, nc = c + dc;
					if (nr >= 0 && nr < height && nc >= 0 && nc < width && board[nr][nc].isMine) count++;
				}
			}
			board[r][c].neighborMines = count;
		}
	}
	return board;
}

// Reveal cell and recursively reveal zero-neighbor cells
function revealCell(board, row, col, width, height) {
	const cell = board[row][col];
	if (cell.revealed || cell.flag) return 0;

	cell.revealed = true;
	let revealedCount = 1;

	if (cell.neighborMines === 0 && !cell.isMine) {
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				const nr = row + dr, nc = col + dc;
				if (nr >= 0 && nr < height && nc >= 0 && nc < width && !board[nr][nc].revealed && !board[nr][nc].flag) {
					revealedCount += revealCell(board, nr, nc, width, height);
				}
			}
		}
	}
	return revealedCount;
}

// Check win condition: all non-mine cells revealed
function checkWin(board, width, height, totalMines) {
	let revealedNonMines = 0;
	for (let r = 0; r < height; r++) {
		for (let c = 0; c < width; c++) {
			const cell = board[r][c];
			if (!cell.isMine && cell.revealed) revealedNonMines++;
		}
	}
	return revealedNonMines === (width * height - totalMines);
}

// Format board to text with emojis
function formatBoard(game, showAll = false) {
	const { board, width, height, startTime } = game;
	const elapsed = Date.now() - startTime;
	const remaining = Math.max(0, MAX_GAME_TIME - elapsed);
	let output = `*Tips*
- Buka semua kotak selain BomB.
- Gunakan angka 1 sampai ${width * height} untuk memilih kotak.
- Kamu menang jika hanya kotak berisi BomB yang belum terbuka.
- Sisa waktu: ${formatTime(remaining)} (batas 5 menit).
- Gunakan \`.mw <angka>\` untuk buka kotak
- Gunakan \`.mw m <angka>\` untuk pasang/lepas bendera.

*!!Minesweeper!!*\n`;

	// Header row
	output += CORNER;
	for (let c = 0; c < width; c++) {
		output += toEmojiNum(c + 1);
	}
	output += '\n';

	// Each row
	for (let r = 0; r < height; r++) {
		output += ROW_PREFIX;
		for (let c = 0; c < width; c++) {
			const cell = board[r][c];
			if (showAll || cell.revealed) {
				if (cell.isMine) output += BOMB;
				else output += toEmojiNum(cell.neighborMines);
			} else {
				if (cell.flag) output += FLAG;
				else output += HIDDEN;
			}
		}
		output += '\n';
	}
	return output;
}

// Helper: send reaction
async function react(conn, m, emoji) {
	await m.reply({ react: { text: emoji, key: m.key } }, false);
}

// Helper: reply message
async function reply(conn, m, game, {text}){
	const boardText = formatBoard(game, false);
	return await updateGameMessage(conn, m, game, boardText+'\n\n'+text);
}

// Send or edit game message, always update stored key
async function updateGameMessage(conn, m, game, newText) {
	const now = Date.now();
	const MAX_EDIT_AGE = 12 * 60 * 1000; // 12 minutes

	if (game.messageKey && (now - game.lastEditTime) < MAX_EDIT_AGE) {
		const { key } = await m.reply({
			text: __adsURL+'\n'+newText,
			edit: game.messageKey,
			mentions: [m.sender]
		});
		game.messageKey = key;
		game.lastEditTime = now;
	} else {
		const { key } = await m.sendThum(newText, game_thumbnail, 'Minesweeper', bot.name, {quoted: conn.quoteContact(m), adsUrl: __adsURL});
		game.messageKey = key;
		game.lastEditTime = now;
	}
	// Persist game state after key update (keyed by sender)
	await db.save(`minesweeper_${m.chat}_${m.sender}`, {
		...game,
		board: JSON.stringify(game.board)
	});
}

// End game and cleanup
async function endGame(conn, m, game, win = false, loss = false, cancel = false) {
	const senderId = m.chat+'_'+m.sender;
	const boardText = formatBoard(game, true);
	let resultMsg = '';
	if (win) resultMsg = '🎉 *Kamu Menang!* 🎉\n';
	else if (loss) resultMsg = '💥 *Kalah!* Bom meledak. 💥\n';
	else if (cancel) resultMsg = '🚫 *Permainan dibatalkan.*\n';
	else if (loss === false && win === false) resultMsg = '⏰ *Waktu habis!* Permainan berakhir.\n';

	const finalMsg = resultMsg + boardText;
	await updateGameMessage(conn, m, game, finalMsg);
	games.delete(senderId);
	await db.remove(`minesweeper_${senderId}`);
	// logger.info(`Game ended for ${m.sender} (win=${win}, loss=${loss}, cancel=${cancel})`);
}

// Toggle flag on a cell
async function toggleFlag(conn, m, game, numbers) {
	const { board, width, height } = game;
	// No need to check player because game is per-sender

	if (game.gameOver) {
		await react(conn, m, '⚠️');
		await reply(conn, m, game, { text: '⚠️ Permainan sudah selesai.', mentions: [m.sender] });
		return;
	}

	let anyChange = false;
	for (const num of numbers) {
		if (num < 1 || num > width * height) {
			await react(conn, m, '🔢');
			await reply(conn, m, game, { text: `❌ Angka ${num} di luar jangkauan (1-${width * height})`, mentions: [m.sender] });
			continue;
		}
		const row = Math.floor((num - 1) / width);
		const col = (num - 1) % width;
		const cell = board[row][col];
		if (cell.revealed) {
			await react(conn, m, '🚫');
			await reply(conn, m, game, { text: `⚠️ Kotak ${num} sudah terbuka, tidak bisa dipasang bendera.`, mentions: [m.sender] });
			continue;
		}
		cell.flag = !cell.flag;
		anyChange = true;
	}

	if (anyChange) {
		const boardText = formatBoard(game, false);
		await updateGameMessage(conn, m, game, boardText);
		await react(conn, m, '🚩');
	}
}

// Handle reveal of multiple cells
async function handleReveal(conn, m, game, numbers) {
	const { board, width, height, totalMines } = game;

	if (game.gameOver) {
		await react(conn, m, '⚠️');
		await reply(conn, m, game, { text: '⚠️ Permainan sudah selesai. Mulai game baru dengan .minesweeper', mentions: [m.sender] });
		return;
	}

	let anyRevealed = false;
	let gameOver = false;
	let win = false;

	for (const num of numbers) {
		if (num < 1 || num > width * height) {
			await react(conn, m, '🔢');
			await reply(conn, m, game, { text: `❌ Angka ${num} di luar jangkauan (1-${width * height})`, mentions: [m.sender] });
			continue;
		}
		const row = Math.floor((num - 1) / width);
		const col = (num - 1) % width;
		const cell = board[row][col];

		if (cell.revealed) continue;
		if (cell.flag) {
			await react(conn, m, '🚩');
			await reply(conn, m, game, { text: `⚠️ Kotak ${num} ditandai bendera. Lepas dulu dengan .mw m ${num}`, mentions: [m.sender] });
			continue;
		}

		anyRevealed = true;

		if (cell.isMine) {
			cell.revealed = true;
			gameOver = true;
			break;
		} else {
			revealCell(board, row, col, width, height);
		}
	}

	if (anyRevealed && !gameOver) {
		win = checkWin(board, width, height, totalMines);
		if (win) gameOver = true;
	}

	const boardText = formatBoard(game, false);
	await updateGameMessage(conn, m, game, boardText);

	if (gameOver) {
		await endGame(conn, m, game, win, !win);
	} else if (!anyRevealed && numbers.length > 0) {
		await react(conn, m, '⚠️');
		await reply(conn, m, game, { text: '⚠️ Tidak ada kotak yang dapat dibuka.', mentions: [m.sender] });
	} else if (anyRevealed) {
		await react(conn, m, '✅');
	}
}

// Check timeout periodically
async function checkTimeout(conn, m, game) {
	const elapsed = Date.now() - game.startTime;
	if (elapsed >= MAX_GAME_TIME && !game.gameOver) {
		game.gameOver = true;
		await endGame(conn, m, game, false, false, false);
		return true;
	}
	return false;
}

// Load or restore game from db (keyed by sender)
async function loadGame(senderId) {
	if (games.has(senderId)) return games.get(senderId);
	const stored = await db.get(`minesweeper_${senderId}`);
	if (stored) {
		if (typeof stored.board === 'string') {
			stored.board = JSON.parse(stored.board);
		}
		games.set(senderId, stored);
		return stored;
	}
	return null;
}

// Simple help text for WhatsApp chat
export function help() {
	return `*🎮 MINESWEEPER HELP 🎮*

*Cara Bermain:*
Buka semua kotak yang bukan bom. Angka menunjukkan jumlah bom di sekitarnya. Tandai bom dengan 🚩.

*Perintah:*
.mw easy / medium / hard - Mulai game (default easy)
.mw <angka> - Buka kotak (contoh: .mw 1,2,3)
.mw m <angka> - Pasang/lepas bendera
.mw exit - Batalkan game
.mw help - Tampilkan ini

*Level:*
Easy	 : 5x5, 5 bom
Medium : 8x8, 12 bom
Hard	 : 10x10, 20 bom

*Waktu: 5 menit per game*
*Penomoran: dari kiri ke kanan, atas ke bawah*

Contoh: .mw easy → .mw 1 → .mw m 6 → .mw 2,3,4,5

Selamat bermain! 💣`;
}

// Main handler
export async function handle(conn, m) {
	const text = m.text?.trim() || '';
	const sender = m.sender;
	const senderId = m.chat+'_'+m.sender;

	if (!text.startsWith('.')) return;

	const parts = text.slice(1).trim().split(/\s+/);
	const cmd = parts[0].toLowerCase();
	const args = parts.slice(1);
	const sub = args[0]?.toLowerCase();
	
	// Command must be .mw ... So if cmd is not mw/minesweeper, ignore
	if (cmd !== 'mw' && cmd !== 'minesweeper') return;

	// Help command
	if (sub === 'help' || sub === '?') {
		await m.reply({ text: help(), mentions: [sender] });
		return;
	}

	// Exit / cancel
	if (sub === 'exit' || sub === 'cancel') {
		const game = await loadGame(senderId);
		if (game) {
			await endGame(conn, m, game, false, false, true);
			await react(conn, m, '✅');
		} else {
			await react(conn, m, '❌');
			await reply(conn, m, game, { text: 'Tidak ada permainan aktif.', mentions: [sender] });
		}
		return;
	}

	// Mark/flag command: .mw m <numbers> or .mw mark <numbers>
	if (sub === 'mark' || sub === 'm') {
		const game = await loadGame(senderId);
		if (!game) {
			await react(conn, m, '❌');
			await reply(conn, m, game, { text: 'Tidak ada permainan aktif. Mulai dengan .mw easy/medium/hard', mentions: [sender] });
			return;
		}
		if (await checkTimeout(conn, m, game)) return;
		const numArgs = args.slice(1);
		let numbers = [];
		for (const part of numArgs) {
			if (part.includes(',')) {
				numbers.push(...part.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)));
			} else {
				const n = parseInt(part);
				if (!isNaN(n)) numbers.push(n);
			}
		}
		if (numbers.length === 0) {
			await react(conn, m, '❓');
			await reply(conn, m, game, { text: 'Gunakan: .mw m 1,2,3 atau .mw mark 5 10', mentions: [sender] });
			return;
		}
		await toggleFlag(conn, m, game, numbers);
		return;
	}










// Start new game: .minesweeper [level] or .mw [level]
	let levelArg = sub; // sub may be level if no mark/exit
	if (sub === 'easy' || sub === 'medium' || sub === 'hard' || (!sub && args.length === 0)) {
		const levelName = levelArg || 'easy';
		const level = LEVELS[levelName];
		if (!level) {
			await react(conn, m, '❓');
			await reply({ text: '\nLevel: easy, medium, hard', mentions: [m.sender] });
			return;
		}
		const { width, height, mines } = level;

		// Cancel existing game
		const existing = await loadGame(senderId);
		if (existing) {
			await endGame(conn, m, existing, false, false, true);
		}

		// Create empty board placeholder (will generate on first move)
		const emptyBoard = Array(height).fill().map(() => Array(width).fill().map(() => ({
			isMine: false,
			revealed: false,
			flag: false,
			neighborMines: 0
		})));

		const game = {
			board: emptyBoard,
			width,
			height,
			totalMines: mines,
			gameOver: false,
			player: m.sender,
			startTime: Date.now(),
			messageKey: null,
			lastEditTime: 0,
			firstMove: true
		};

		games.set(senderId, game);

		const initialBoardText = formatBoard(game, false);
		const { key } = await m.sendThum(initialBoardText, game_thumbnail, 'Minesweeper', bot.name, {quoted: conn.quoteContact(m), adsUrl: __adsURL});
		game.messageKey = key;
		game.lastEditTime = Date.now();
		await db.save(`minesweeper_${senderId}`, {
			...game,
			board: JSON.stringify(game.board)
		});
		await react(conn, m, '🎮');
		// logger.info(`Minesweeper game started in ${m.chat} by ${m.sender} (${width}x${height}, ${mines} mines)`);
		return;
	}



	// If we reach here, no subcommand, assume numbers
	const game = await loadGame(senderId);
	if (!game) {
		await react(conn, m, '❌');
		await reply(conn, m, game, { text: 'Tidak ada permainan aktif. Mulai dengan .mw easy/medium/hard', mentions: [sender] });
		return;
	}
	if (await checkTimeout(conn, m, game)) return;

	// Parse numbers from all args
	let numbers = [];
	for (const part of args) {
		if (part.includes(',')) {
			numbers.push(...part.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)));
		} else {
			const n = parseInt(part);
			if (!isNaN(n)) numbers.push(n);
		}
	}

	if (numbers.length === 0) {
		await react(conn, m, '❓');
		await reply(conn, m, game, { text: 'Format: .mw 1,2,3 atau .mw 5 10 15', mentions: [sender] });
		return;
	}

	// Handle first move: generate board with safe first click
	if (game.firstMove) {
		const firstNum = numbers[0];
		const row = Math.floor((firstNum - 1) / game.width);
		const col = (firstNum - 1) % game.width;
		if (row >= 0 && row < game.height && col >= 0 && col < game.width) {
			game.board = generateBoard(game.width, game.height, game.totalMines, row, col);
			game.firstMove = false;
			await db.save(`minesweeper_${senderId}`, {
				...game,
				board: JSON.stringify(game.board)
			});
		} else {
			await react(conn, m, '🔢');
			await reply(conn, m, game, { text: `❌ Angka ${firstNum} tidak valid.`, mentions: [sender] });
			return;
		}
	}

	await handleReveal(conn, m, game, numbers);
}

