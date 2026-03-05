import fs from 'fs'
import { jidDecode } from 'baileys'
import logger from '../../utils/logger.js'
import addcmd from '../../utils/cmd_msg.js'

class TicTacToe {
	// GameResult
	static DRAW = 3;
	static PLAYER_B_WINS = 2;
	static PLAYER_A_WINS = 1;
	static NEXT_TURN = 0;
	static WRONG_POSITION = -1;
	static INVALID_INPUT = -2;
	
	#boardA = 0;
	#boardB = 0;
	#turn = 0;
	#conditions = [7, 56, 73, 84, 146, 273, 292, 448];
	#difficulty;
	
	constructor(playerA='Player 1', playerB='Player 2') {
		this.playerA = playerA
		this.playerB = playerB
		this.gameResult = 0
	}
	
	get difficulty() {
		return this.#difficulty
	}
	
	set difficulty(difficulty) {
		if(!this.#difficulty)
			this.#difficulty = difficulty
	}
	
	get nextPlayer() {
		return this.#turn > -1 ? this.#turn%2 ? this.playerB : this.playerA : null
	}
	
	#pos(x, y) {
		return 1 << x + y * 3
	}
	
	#detect(pos, a, b) {
		return (a | b) & pos
	}
	
	#winner(a, b) {
		if ((~(a|b) & 511) === 0)
			return 3
		for (const c of this.#conditions) {
			if ((b & c) === c) return 2
			if ((a & c) === c) return 1
		}
		return 0
	}
	
	#next(pos) {
		if ( ++this.#turn%2 )
			this.#boardA |= pos
		else
			this.#boardB |= pos
	}
	
	autoPlay() {
		const bestMove = getBestMove(this.#boardA, this.#boardB, this.#turn%2? 'B': 'A', this.#difficulty );
		const pos = bestMove?.mask;
		
		this.#next(pos)
	}
	
	input(input1, input2) {
		input1 = Number(input1)
		input2 = Number(input2)
		
		//# fix-bug
		if (!(input1 >= 0 && input1 < 3 && input1 >= 0 && input1 < 3))
			return -2
		
		const pos = this.#pos(input1, input2)
		var a = this.#boardA, b = this.#boardB
		
		if (this.#detect(pos, a, b))
			return -1
		
		this.#next(pos)
	}
	
	nextTurn(input1, input2) {
		var ret
		if (this.#turn < 0)
			return this.gameResult
		else
		if (this.nextPlayer === 'auto')
			this.autoPlay()
		else
			ret = this.input(input1, input2)
		
		const win = this.#winner(this.#boardA, this.#boardB)
			
		if (win>0)
			this.#turn = -1
			
		this.gameResult = win
		
		return ret || win || 0
	}
	
	render(constum = ` #| 0 | 1 | 2 |
---------------
 0| %0% | %0% | %0% |
--|---|---|---|
 1| %0% | %0% | %0% |
--|---|---|---|
 2| %0% | %0% | %0% |
---------------`) {
		var x = this.#boardA, y = this.#boardB, p = 1
		return constum.
		replace(/%0%/g,a=>{
			a = (x & p) ? 'O' : (y & p) ? 'X' : '-'
			p <<= 1
			return a
		})
	}
}


class TTT4WA extends TicTacToe {
	// GameSatus
	static STATUS_HELD = 0;
	static STATUS_PLAY = 1;
	static STATUS_END = 2;
	
	#lastMsg = null;
	#lastKey = null;
	#token;
	#timestamp = Math.floor(Date.now() / 1000);
	#participant;
	
	constructor(m) {
		super('@'+jidDecode(m.sender).user, null)
		this.#token = this._createToken()
		this.status = 0
		this.#participant = [m.sender]
		this.board = '❇️1️⃣2️⃣3️⃣⬛\n1️⃣%0%%0%%0%⬛\n2️⃣%0%%0%%0%⬛\n3️⃣%0%%0%%0%⬛\n⬛⬛⬛⬛❇️' 
	}
	
	_createToken() {
		var T = Date.now()
		T = parseInt(( ~T ).toString(16),32)
		T = ((T << 24 & 0x1fffffff) ^ (T) ).toString(32).slice(-6)
		return T
	}
	
	async _createMsg(m, text) {
		const now = Date.now(),
			thumb = './assets/games/banner/tictactoe.jpg',
			media = 'robz.bot/vid?q='+ now
		this.#timestamp = Math.floor(now / 1000)
		this.#lastMsg = await m.reply ({
				contextInfo: {
					mentionedJid: this.#participant,
					externalAdReply: {
						title: 'TicTacToe',
						body: global.bot.name,
						mediaType: 1,
						previewType: 0,
						showAdAttribution: false,
						renderLargerThumbnail: false,
						thumbnail: fs.readFileSync(thumb),
						mediaUrl: media,
						sourceUrl:'',
					},
				},
				text
			}, true, { ephemeralExpiration: 86400, quoted: null})
		this.#lastKey = this.#lastMsg.key
	}
	
	get token() {
		return this.#token
	}
	
	async handle(bot, m) {
		const [x, y] = m.arguments[0]?.split(' ') || []
		var r = this.nextTurn(x - 1, y - 1)
		
		if (r < 1 && this.nextPlayer === 'auto')
			r = this.nextTurn()
		
		await this.render(bot, m)
		
		if (r > 0)
			this.status = 2,
			await this.exit(bot, m)
	}
	
	async start(bot, m) {
		if (this.status != 0)
			return
		
		const _ = this
		const p = _.#participant
		p.push(m.sender)
		this.playerB = '@'+jidDecode(p[1]).user
		this.status = 1
		
		await this.render(bot, m)
	}
	
	async startWithBot(bot, m, difficulty = 'normal') {
		if (this.status != 0)
			return
		
		this.playerB = 'auto'
		this.status = 1
		this.difficulty = difficulty
		
		await this.render(bot, m)
	}
	
	async exit(bot, m) {
		if (this.status == 0)
			await m.reply('Game dibatalkan.')
		if (this.status == 1)
			await m.reply('Permainan berakhir', true, {quoted: this.#lastMsg})
		this.status = 2
	}
	
	async render(bot, m) {
		const board = super.render(this.board).replace(/-|X|O/g, a=>({'-':'⬜',X:'❌',O:'⭕'}[a]))
		const ic = ['🟢', '🎉']
		var turnA = '', turnB = ''
		
		if (this.gameResult < 1)
			if (this.nextPlayer == this.playerA)
				turnA = ic[0]
			else
				turnB = ic[0]
		else if (this.gameResult == 1)
			turnA = ic[1],
			await m.reply({text: `Mantap. Selamat ${this.playerA}, kamu memang!!`, mentions: [m.sender]}, true, {quoted: bot.quoteContact(m)})
		else if (this.gameResult == 2)
			turnB = ic[1],
			await m.reply({text: this.playerB == 'auto' ? `Sayang sekali, ${this.playerA}, kamu harus kalah!!` : `Horeyy, Selamat ${this.playerB}, kamu memang!!`, mentions: [m.sender]}, true, {quoted: bot.quoteContact(m)})
		
		const reply = `*Tic Tac Toe*

Tips:
- Gunakan \`.ttt <x> <y>\` untuk bermain.
- Hanya gunakan angka 1, 2 dan 3.
- Siapa yg membuat posisi simetris akan menang.

${board}
_____________________
- ⭕ ${this.playerA} ${turnA}
- ❌ ${this.playerB == 'auto' ? 'Machine 🕹️': this.playerB} ${turnB}`

		const key = this.#lastKey
		const now = Math.floor(Date.now() / 1000);
		const diffInSeconds = now - this.#timestamp;
		if (key && diffInSeconds < 840) { // 14min
		// edit
			const msg = await bot.sendMessage(m.chat, {
				text: reply,
				edit: key,
				mentions: this.#participant
			}, {
				contextInfo: {
					mentionedJid: this.#participant
				}
			})
			
			this.#lastMsg = msg
			this.#lastKey = msg.key
		} else
		// or create
			this._createMsg(m, reply)

		if (this.gameResult == 3)
			await m.reply('Seri!! Tak ada satu pun.. yg menang.', true, {quoted: this.#lastMsg})
	}
}

const session = {}

function _id(chat, sender) {
	return `${chat}+${sender}`
}

export const command = {
	onlyGroup: true,
	command: 'tictactoe',
	tag: 'Game & Fun',
	description: 'Bermain TicTacToe bersama teman mu.',
	get help(){
		return [
			'Ayo mainkan! caranya? hmm oke begini..',
			'',
			'*Tips*',
			'- *Memulai permainan*',
			'- `.ttt create` untuk player pertama. token akan dibuat. atau,',
			'- `.ttt create <solo|easy|hard>` untuk coba bermain solo.',
			//'- `.ttt create solo` untuk kamu yang jomblo atau masih single.',
			'- `.ttt join <token>` untuk player kedua, pastikan isi token dengan benar',
			'',
			'- *Permainan dimulai*',
			'- gunakan `.ttt <x> <y>` untuk memilih posisi',
			'',
			'- *Mengakhiri sesi permainan*',
			'- `.ttt cancel` atau `.ttt exit`',
			'',
			'Mudah bukan? Ayo bermain bersama!'
		].join('\n')
	},
	handle,
}

addcmd(
	'ttt',
	command.handle,
	{
		...command
	}
)

async function  handle(bot, m) {
	const {chat, sender} = m,
		id = _id(chat, sender),
		arg = m.arguments[0]?.split(' ') || []
	var sesi = session[id]
	try {
	
		if (sesi) {
			if (/^(cancel|exit|batal|berhenti|keluar)$/.test(arg[0])){
				delete session[id]
				return await sesi.exit(bot, m)
			}
			if (sesi.status == TTT4WA.STATUS_END)
				delete session[id]
			if (sesi.status == TTT4WA.STATUS_PLAY)
				return await sesi.handle(bot, m)
			if (sesi.status == TTT4WA.STATUS_HELD)
				return await m.reply('Tunggu temanmu memasukan token ya..')
		}
		
		if(!session[id]) {
			if (/^(create|(mem)?buat|bikin)$/i.test(arg[0])) {
				const {token} = session[id] = new TTT4WA(m)
				
				if(/(easy|mudah)|(normal|solo|sendiri)|(hard|sulit)/i.test(arg[1])) {
					arg[1] = RegExp.$1? 'easy': RegExp.$3? 'hard' : 'normal'
					session[id].startWithBot(bot, m, arg[1])
				} else {
					await session[id]._createMsg(m, `Kamu membuat sesi baru. katakan pada teman mu untuk mengetik\n\`.ttt join ${token}\`\nagar ia bisa bergabung.\n\n*Inf:* Token berlaku untuk 5 menit.`)
				
					session[token] = session[id],
					session[token].id = setTimeout(async _=>{
						if (session[token]) {
							try { await bot.sendMessage(chat, 'Game dibatalkan.', { quoted: m }) } catch(e){}
							delete session[token]
						}
						if (session[id])
							delete session[id]
					}, 300000)
				}
			} else if (/^(join|(ber)?gabung|ikuti?)$/i.test(arg[0])) {
				const token = arg[1]
				
				if (!session[token])
					return await m.reply('Token tidak valid.')
				sesi = session[id] = session[token]
				delete session[token]
				
				clearTimeout(sesi.id)
				await sesi.start(bot, m)
			} else
				await m.reply('Belum ada sesi bermain untuk mu. baca panduannya di `.help ttt`')
		}	
	} catch (e) {
			logger.error(e)
	}
}

/**
 * here functions by DolaAI departure of CiciAI
 */

// Fungsi untuk mendapatkan langkah berdasarkan tingkat kesulitan
function getBestMove(boardA, boardB, targetPlayer, difficulty = 'hard') {
    // Validasi input dasar
    const winPatterns = [0b111000000, 0b000111000, 0b000000111, 
                         0b100100100, 0b010010010, 0b001001001, 
                         0b100010001, 0b001010100];
    
    // Cek apakah game sudah berakhir
    for (const pattern of winPatterns) {
        if ((boardA & pattern) === pattern || (boardB & pattern) === pattern) return null;
    }
    if ((boardA | boardB) === 0b111111111) return null;
    
    // Ambil semua sel kosong
    const emptyCells = [];
    for (let i = 0; i < 9; i++) {
        const mask = 1 << (8 - i);
        if ((boardA & mask) === 0 && (boardB & mask) === 0) {
            emptyCells.push({ mask, position: i });
        }
    }

    // Hitung langkah optimal terlebih dahulu
    let bestMove = null;
    if (difficulty !== 'easy' || Math.random() < 0.2) { // Bahkan easy kadang optimal
        let bestScore = targetPlayer === 'A' ? -Infinity : Infinity;
        for (const cell of emptyCells) {
            const newA = targetPlayer === 'A' ? boardA | cell.mask : boardA;
            const newB = targetPlayer === 'B' ? boardB | cell.mask : boardB;
            const score = minimax(newA, newB, 1, targetPlayer === 'A' ? 'B' : 'A');
            
            if ((targetPlayer === 'A' && score > bestScore) || (targetPlayer === 'B' && score < bestScore)) {
                bestScore = score;
                bestMove = {
                    mask: cell.mask,
                    position: cell.position,
                    boardAfter: newA,
                    boardBAfter: newB
                };
            }
        }
    } else {
    	bestMove = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    }

    // Tentukan langkah akhir berdasarkan kesulitan
    switch(difficulty.toLowerCase()) {
        case 'easy':
            // 20% optimal, 80% acak
            return Math.random() < 0.2 ? bestMove : emptyCells[Math.floor(Math.random() * emptyCells.length)];
        case 'normal':
            // 70% optimal, 30% acak
            return Math.random() < 0.7 ? bestMove : emptyCells[Math.floor(Math.random() * emptyCells.length)];
        case 'hard':
        default:
            // Selalu optimal
            return bestMove;
    }
}



// Fungsi untuk mendapatkan langkah terbaik (mengembalikan posisi sel atau mask biner)
function getBestMove2(boardA, boardB, targetPlayer) {
    // Validasi input: pastikan pemain target valid dan game belum berakhir
    const winPatterns = [0b111000000, 0b000111000, 0b000000111, 
                         0b100100100, 0b010010010, 0b001001001, 
                         0b100010001, 0b001010100];
    
    for (const pattern of winPatterns) {
        if ((boardA & pattern) === pattern || (boardB & pattern) === pattern) {
            return null; // Game sudah berakhir, tidak ada langkah lagi
        }
    }
    if ((boardA | boardB) === 0b111111111) return null; // Papan penuh
    
    let bestScore;
    let bestMask = null;
    const emptyCells = [];
    
    // Cari semua sel kosong
    for (let i = 0; i < 9; i++) {
        const mask = 1 << (8 - i);
        if ((boardA & mask) === 0 && (boardB & mask) === 0) {
            emptyCells.push({ mask, position: i }); // Simpan mask dan posisi angka (0-8)
        }
    }
    
    if (targetPlayer === 'A') {
        bestScore = -Infinity;
        for (const cell of emptyCells) {
            const score = minimax(boardA | cell.mask, boardB, 1, 'B');
            if (score > bestScore) {
                bestScore = score;
                bestMask = cell;
            }
        }
    } else if (targetPlayer === 'B') {
        bestScore = Infinity;
        for (const cell of emptyCells) {
            const score = minimax(boardA, boardB | cell.mask, 1, 'A');
            if (score < bestScore) {
                bestScore = score;
                bestMask = cell;
            }
        }
    } else {
        return null; // Pemain tidak valid
    }
    
    // Mengembalikan objek dengan mask biner dan posisi sel (0 = kiri atas, 8 = kanan bawah)
    return {
        mask: bestMask.mask,
        position: bestMask.position,
        boardAfter: targetPlayer === 'A' ? (boardA | bestMask.mask) : boardA,
        boardBAfter: targetPlayer === 'B' ? (boardB | bestMask.mask) : boardB
    };
}

function minimax(boardA, boardB, turn, currentPlayer) {
    // Cek kondisi akhir game
    const winPatterns = [0b111000000, 0b000111000, 0b000000111, 
                         0b100100100, 0b010010010, 0b001001001, 
                         0b100010001, 0b001010100];
    
    // Cek apakah ada pemenang
    for (const pattern of winPatterns) {
        if ((boardA & pattern) === pattern) return 10 - turn; // Player A menang, skor positif
        if ((boardB & pattern) === pattern) return turn - 10; // Player B menang, skor negatif
    }
    
    // Cek jika papan penuh (seri)
    if ((boardA | boardB) === 0b111111111) return 0;
    
    let bestScore;
    const emptyCells = [];
    
    // Cari semua sel kosong
    for (let i = 0; i < 9; i++) {
        const mask = 1 << (8 - i); // Posisi biner dari kiri atas (0) ke kanan bawah (8)
        if ((boardA & mask) === 0 && (boardB & mask) === 0) {
            emptyCells.push(mask);
        }
    }
    
    if (currentPlayer === 'A') {
        bestScore = -Infinity;
        // Coba semua langkah yang mungkin untuk Player A
        for (const mask of emptyCells) {
            const newBoardA = boardA | mask;
            const score = minimax(newBoardA, boardB, turn + 1, 'B');
            bestScore = Math.max(score, bestScore);
        }
    } else {
        bestScore = Infinity;
        // Coba semua langkah yang mungkin untuk Player B
        for (const mask of emptyCells) {
            const newBoardB = boardB | mask;
            const score = minimax(boardA, newBoardB, turn + 1, 'A');
            bestScore = Math.min(score, bestScore);
        }
    }
    
    return bestScore;
}