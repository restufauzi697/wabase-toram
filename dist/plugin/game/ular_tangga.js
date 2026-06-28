import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { jidDecode } from 'baileys';
import db from '../../utils/session/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ----------------------------- Persistent Storage Keys -----------------------------
const STORAGE_KEY = 'games_ular_tangga';
const THEMES_KEY = 'ular_tangga_themes';

// ----------------------------- Default Theme (Classic 100) -----------------------------
const DEFAULT_THEME = {
  name: 'classic',
  boardSize: 100,
  rows: 10,
  cols: 10,
  cell: { w:48, h:48 },
  padding: 18,
  boardPath: path.join(__dirname, '../../../assets/games/ular_tangga/board-100.jpg'),
  pionPath: path.join(__dirname, '../../../assets/games/ular_tangga/sprite_pion_48.jpg'),
  positions: null,
  snakes: {
    30: 7, 47: 13, 56: 19, 73: 51,
    82: 42, 92: 75, 98: 55
  },
  ladders: {
    4: 25, 21: 39, 26: 67, 43: 76, 59: 80, 71: 89
  }
};

const EXTRA_THEMES = [
  {
    "name": "mini",
    "boardSize": 36,
    "rows": 6,
    "cols": 6,
    cell: { w:64, h:64 },
    "padding": 120,
    boardPath: path.join(__dirname, '../../../assets/games/ular_tangga/board-36.jpg'),
    pionPath: path.join(__dirname, '../../../assets/games/ular_tangga/sprite_pion_64.png'),
    "positions": [
      {"x": 152, "y": 474}, {"x": 216, "y": 474}, {"x": 280, "y": 474}, {"x": 345, "y": 474}, {"x": 409, "y": 474}, {"x": 473, "y": 474},
      {"x": 473, "y": 410}, {"x": 409, "y": 410}, {"x": 345, "y": 410}, {"x": 280, "y": 410}, {"x": 216, "y": 410}, {"x": 152, "y": 410},
      {"x": 152, "y": 346}, {"x": 216, "y": 346}, {"x": 280, "y": 346}, {"x": 345, "y": 346}, {"x": 409, "y": 346}, {"x": 473, "y": 346},
      {"x": 152, "y": 282}, {"x": 216, "y": 282}, {"x": 280, "y": 282}, {"x": 345, "y": 282}, {"x": 409, "y": 282}, {"x": 473, "y": 282},
      {"x": 152, "y": 218}, {"x": 216, "y": 218}, {"x": 280, "y": 218}, {"x": 345, "y": 218}, {"x": 409, "y": 218}, {"x": 473, "y": 218},
      {"x": 152, "y": 154}, {"x": 216, "y": 154}, {"x": 280, "y": 154}, {"x": 345, "y": 154}, {"x": 409, "y": 154}, {"x": 473, "y": 154}
    ],
    "snakes": {
      "11": 3,
      "23": 16,
      "25": 14,
      "35": 29
    },
    "ladders": {
      "6": 18,
      "12": 24,
      "15": 27
    }
  }
];

// ----------------------------- Tema -----------------------------
let themes = new Map();

async function loadThemes() {
  const savedThemes = await db.get(THEMES_KEY);
  if (savedThemes && Array.isArray(savedThemes)) {
    savedThemes.forEach(t => themes.set(t.name, t));
  } else {
    themes.set(DEFAULT_THEME.name, DEFAULT_THEME);
    EXTRA_THEMES.forEach(t => themes.set(t.name, t));
    await saveThemes();
  }
}

async function saveThemes() {
  await db.save(THEMES_KEY, Array.from(themes.values()));
}

// ----------------------------- GameSession -----------------------------
class GameSession {
  constructor(creator, creatorName, themeName, isSolo = false) {
    this.token = this.generateToken();
    this.creator = creator; // JID asli
    this.players = [{ id: creator, name: creatorName, position: 1, isBot: false }];
    this.status = 'waiting';
    this.currentTurn = 0;
    this.themeName = themeName;
    this.isSolo = isSolo;
    const theme = themes.get(themeName);
    if (!theme) throw new Error(`Theme ${themeName} not found`);
    this.theme = theme;
    this.boardSize = theme.boardSize;
    this.rows = theme.rows;
    this.cols = theme.cols;
    this.cell = theme.cell || {};
    this.padding = theme.padding;
    this.boardPath = theme.boardPath;
    this.pionPath = theme.pionPath;
    this.customPositions = theme.positions || null;
    this.snakes = theme.snakes || {};
    this.ladders = theme.ladders || {};

    if (isSolo) {
      this.players.push({ id: 'bot', name: 'Bot', position: 1, isBot: true });
    }
  }

  generateToken() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  addPlayer(senderId, senderName) {
    if (this.isSolo) return false;
    if (this.players.length >= 4) return false;
    if (this.players.some(p => p.id === senderId)) return false;
    this.players.push({ id: senderId, name: senderName, position: 1, isBot: false });
    return true;
  }

  start() {
    if (!this.isSolo && this.players.length < 2) return false;
    if (this.status !== 'waiting') return false;
    this.status = 'playing';
    this.currentTurn = 0;
    return true;
  }

  movePlayer(playerIdx, diceValue) {
    let player = this.players[playerIdx];
    let newPos = player.position + diceValue;
    let message = '';
    if (newPos > this.boardSize) {
      newPos = player.position - this.boardSize;
      message = `⏪ Melangkah mundur karena melebihi kotak ${this.boardSize}.`;
    } else {
      if (this.snakes[newPos]) {
        message = `🐍 Ular! Turun dari ${newPos} ke ${this.snakes[newPos]}`;
        newPos = this.snakes[newPos];
      } else if (this.ladders[newPos]) {
        message = `🪜 Tangga! Naik dari ${newPos} ke ${this.ladders[newPos]}`;
        newPos = this.ladders[newPos];
      }
    }
    player.position = newPos;
    return { newPos, message };
  }

  isWin(playerIdx) {
    return this.players[playerIdx].position === this.boardSize;
  }

  nextTurn() {
    this.currentTurn = (this.currentTurn + 1) % this.players.length;
  }

  getPlayerName(player) {
    if (player.isBot) return 'Bot';
    return `@${jidDecode(player.id).user}`;
  }

  getMentions() {
    return this.players.filter(p => !p.isBot).map(p => p.id);
  }

  toJSON() {
    return {
      token: this.token,
      creator: this.creator,
      players: this.players,
      status: this.status,
      currentTurn: this.currentTurn,
      themeName: this.themeName,
      isSolo: this.isSolo,
      boardSize: this.boardSize,
      rows: this.rows,
      cols: this.cols,
      padding: this.padding,
      boardPath: this.boardPath,
      pionPath: this.pionPath,
      customPositions: this.customPositions,
      snakes: this.snakes,
      ladders: this.ladders
    };
  }

  static fromJSON(data) {
    const session = new GameSession(data.creator, '', data.themeName, data.isSolo);
    session.token = data.token;
    session.players = data.players;
    session.status = data.status;
    session.currentTurn = data.currentTurn;
    session.boardSize = data.boardSize;
    session.rows = data.rows;
    session.cols = data.cols;
    session.padding = data.padding;
    session.boardPath = data.boardPath;
    session.pionPath = data.pionPath;
    session.customPositions = data.customPositions;
    session.snakes = data.snakes;
    session.ladders = data.ladders;
    return session;
  }
}

// ----------------------------- Render Papan (dengan ukuran pion dinamis) -----------------------------
async function renderBoard(game, showPions = true) {
  const board = sharp(game.boardPath);
  const boardMeta = await board.metadata();
  const boardWidth = boardMeta.width;
  const boardHeight = boardMeta.height;
  const cellW = game.cell.w || (boardWidth - 2 * game.padding) / game.cols;
  const cellH = game.cell.h || (boardHeight - 2 * game.padding) / game.rows;

  let getCellCenter;
  if (game.customPositions && game.customPositions.length === game.boardSize) {
    getCellCenter = (cellNumber) => game.customPositions[cellNumber - 1];
  } else {
    getCellCenter = (cellNumber) => {
      const idx = cellNumber - 1;
      let row = Math.floor(idx / game.cols);
      let col = idx % game.cols;
      if (row % 2 === 1) col = game.cols - 1 - col;
      const x = game.padding + col * cellW + cellW / 2;
      const y = boardHeight - game.padding - (row + 1) * cellH + cellH / 2;
      return { x, y };
    };
  }

  // Baca dimensi pion
  let pionWidth = 48, pionHeight = 48;
  try {
    const pionMeta = await sharp(game.pionPath).metadata();
    pionWidth = pionMeta.width / 4;
    pionHeight = pionMeta.height;
  } catch (err) {
    console.warn('Gagal baca dimensi pion, gunakan default 48x48', err);
  }

  // Kelompokkan pemain berdasarkan posisi
  const positionMap = new Map(); // posisi -> array of {playerIndex, variant}
  for (let i = 0; i < game.players.length; i++) {
    const pos = game.players[i].position;
    if (!positionMap.has(pos)) positionMap.set(pos, []);
    positionMap.get(pos).push({ playerIndex: i, variant: i % 4 });
  }

  const compositeOps = [];
  if (showPions) {
    for (let [pos, playersAtPos] of positionMap.entries()) {
      const { x, y } = getCellCenter(pos);
      const count = playersAtPos.length;
      // Tentukan offset per pion: lingkaran dengan radius 12px
      const radius = Math.min(cellW, cellH) / 4;
      for (let idx = 0; idx < count; idx++) {
        const { playerIndex, variant } = playersAtPos[idx];
        let offsetX = 0, offsetY = 0;
        if (count > 1) {
          const angle = (idx / count) * 2 * Math.PI;
          offsetX = Math.cos(angle) * radius;
          offsetY = Math.sin(angle) * radius;
        }
        const left = Math.round(x - pionWidth / 2 + offsetX);
        const top = Math.round(y - pionHeight / 2 + offsetY);
        // Pastikan tidak keluar kotak (opsional: clamp)
        // Kita tidak clamp agar tetap terlihat, tapi bisa ditambahkan batasan jika perlu
        const pionSprite = await sharp(game.pionPath)
          .extract({ left: variant * pionWidth, top: 0, width: pionWidth, height: pionHeight })
          .png()
          .toBuffer();
        compositeOps.push({ input: pionSprite, top, left });
      }
    }
  }

  return await board.composite(compositeOps).png().toBuffer();
}

// ----------------------------- Helper Dadu -----------------------------
async function getDiceSticker(number) {
  const dicePath = path.join(__dirname, `../../../assets/games/ular_tangga/frame_dadu_merah_${number}.webp`);
  return await fs.readFile(dicePath);
}

// ----------------------------- Bot Logic -----------------------------
async function botTurn(conn, game, token, matchPrefix, msgReply) {
  const currentPlayer = game.players[game.currentTurn];
  if (!currentPlayer.isBot) return false;

  await new Promise(resolve => setTimeout(resolve, 1500));
  const dice = Math.floor(Math.random() * 6) + 1;
  const oldPos = currentPlayer.position;
  const { newPos, message: specialMsg } = game.movePlayer(game.currentTurn, dice);
  let moveMsg = `🤖 *Bot* mendapat dadu ${dice}, bergerak dari ${oldPos} → ${newPos}.`;
  if (specialMsg) moveMsg += ` ${specialMsg}`;

  const diceSticker = await getDiceSticker(dice);
  await conn.sendMessage(msgReply.chat, { sticker: diceSticker }, { ephemeralExpiration: 86400, quoted: null});

  if (game.isWin(game.currentTurn)) {
    const finalBoard = await renderBoard(game);
    await conn.sendMessage(msgReply.chat, {
      image: finalBoard,
      caption: `🤖 *Bot MENANG!* 🤖\n${moveMsg}\nGame selesai.`,
      mentions: game.getMentions()
    }, { ephemeralExpiration: 86400, quoted: null});
    games.delete(token);
    await saveGames();
    return true;
  }

  game.nextTurn();
  await saveGames();
  const nextPlayer = game.players[game.currentTurn];
  const boardImg = await renderBoard(game);
  await conn.sendMessage(msgReply.chat, {
    image: boardImg,
    caption: `${moveMsg}\n\nGiliran berikutnya: ${game.getPlayerName(nextPlayer)}`,
    mentions: game.getMentions()
  }, { ephemeralExpiration: 86400, quoted: null});

  if (nextPlayer.isBot) {
    await botTurn(conn, game, token, matchPrefix, msgReply);
  }
  return true;
}

// ----------------------------- Global State -----------------------------
let games = new Map();

async function loadGames() {
  const saved = await db.get(STORAGE_KEY);
  if (saved && Array.isArray(saved)) {
    for (const data of saved) {
      games.set(data.token, GameSession.fromJSON(data));
    }
  }
}

async function saveGames() {
  const gameList = Array.from(games.values()).map(g => g.toJSON());
  await db.save(STORAGE_KEY, gameList);
}

// ----------------------------- Handler Utama -----------------------------
export async function handle(conn, msg) {
  const text = msg.text || '';
  const match = text.match(/^\.(ulartangga|ut)\s+(.*)/i);
  if (!match) return;

  const args = match[2].trim().split(/\s+/);
  const command = args[0]?.toLowerCase();
  const senderJid = msg.sender;
  const senderName = `@${jidDecode(senderJid).user}`;
  const chatId = msg.chat;

  // --- THEME LIST ---
  if (command === 'theme') {
    const themeNames = Array.from(themes.keys()).join(', ');
    return msg.reply({
      text: `🎨 *Tema tersedia:*\n${themeNames}\n\nGunakan: .ut create <tema> [solo]`,
      mentions: [senderJid]
    });
  }

  // --- PREVIEW BOARD ---
  if (command === 'preview') {
    let themeName = args[1];
    if (!themeName || !themes.has(themeName)) {
      return msg.reply({ text: `❌ Tema "${themeName}" tidak ditemukan.`, mentions: [senderJid] });
    }
    const theme = themes.get(themeName);
    const tempGame = {
      boardPath: theme.boardPath,
      padding: theme.padding,
      rows: theme.rows,
      cols: theme.cols,
      boardSize: theme.boardSize,
      customPositions: theme.positions,
      players: [],
      pionPath: theme.pionPath
    };
    const boardBuffer = await renderBoard(tempGame, false);
    return msg.reply({
      image: boardBuffer,
      caption: `📋 *Preview papan: ${themeName}*`,
      mentions: [senderJid]
    }, true, { ephemeralExpiration: 86400, quoted: null});
  }

  // --- CREATE ---
  if (command === 'create' || command === 'buat') {
    for (let [token, game] of games.entries()) {
      if (game.players.some(p => p.id === senderJid) && game.status !== 'finished') {
        return msg.reply({
          text: `❌ Kamu masih punya game aktif (token: ${token}). Gunakan *exit* dulu.`,
          mentions: [senderJid]
        });
      }
    }

    let themeName = args[1];
    let isSolo = false;
    if (args[2] === 'solo') isSolo = true;
    if (themeName === 'solo') {
      isSolo = true;
      themeName = null;
    }
    if (!themeName || !themes.has(themeName)) {
      const themeList = Array.from(themes.keys());
      themeName = themeList[Math.floor(Math.random() * themeList.length)];
      if (args[1] && args[1] !== 'solo') {
        await msg.reply({ text: `⚠️ Tema "${args[1]}" tidak ada. Pilih random: *${themeName}*.`, mentions: [senderJid] });
      }
    }

    try {
      const game = new GameSession(senderJid, senderName, themeName, isSolo);
      games.set(game.token, game);
      await saveGames();
      const modeText = isSolo ? ' (Mode Solo vs Bot)' : '';
      return msg.reply({
        text: `🎲 *Game Ular Tangga* dibuat!${modeText}\nTema: *${themeName}*\nToken: *${game.token}*\nKetik *${match[1]} join ${game.token}* untuk bergabung.\nMinimal 2 pemain, maksimal 4.${isSolo ? '\nMode solo: kamu vs Bot, tidak bisa join.' : ''}`,
        mentions: [senderJid]
      });
    } catch (err) {
      return msg.reply({ text: `❌ Gagal: ${err.message}`, mentions: [senderJid] });
    }
  }

  // --- JOIN ---
  if (command === 'join') {
    const token = args[1];
    if (!token) return msg.reply({ text: '❌ .ut join <token>', mentions: [senderJid] });
    const game = games.get(token);
    if (!game) return msg.reply({ text: '❌ Token tidak valid.', mentions: [senderJid] });
    if (game.status !== 'waiting') return msg.reply({ text: '❌ Game sudah dimulai.', mentions: [senderJid] });
    if (game.isSolo) return msg.reply({ text: '❌ Game mode solo, tidak bisa join.', mentions: [senderJid] });
    if (game.players.some(p => p.id === senderJid)) return msg.reply({ text: '❌ Kamu sudah bergabung.', mentions: [senderJid] });
    if (game.players.length >= 4) return msg.reply({ text: '❌ Penuh (maks 4 pemain).', mentions: [senderJid] });

    game.addPlayer(senderJid, senderName);
    await saveGames();
    const playerList = game.players.map((p, i) => `${i+1}. ${game.getPlayerName(p)}`).join('\n');
    return msg.reply({
      text: `✅ ${senderName} bergabung ke *${token}* (Tema: ${game.themeName}).\n👥 Pemain:\n${playerList}\nKetik *${match[1]} start* untuk mulai.`,
      mentions: [senderJid, ...game.getMentions()]
    });
  }

  // --- START ---
  if (command === 'start') {
    let game = null, myToken = null;
    for (let [token, g] of games.entries()) {
      if (g.players.some(p => p.id === senderJid)) {
        game = g;
        myToken = token;
        break;
      }
    }
    if (!game) return msg.reply({ text: '❌ Kamu tidak dalam sesi game.', mentions: [senderJid] });
    if (game.status !== 'waiting') return msg.reply({ text: '❌ Game sudah dimulai.', mentions: [senderJid] });
    if (game.creator !== senderJid) return msg.reply({ text: '❌ Hanya pembuat game yang bisa start.', mentions: [senderJid] });
    if (!game.isSolo && game.players.length < 2) return msg.reply({ text: '❌ Minimal 2 pemain.', mentions: [senderJid] });

    game.start();
    await saveGames();
    const firstPlayer = game.players[0];
    const boardImg = await renderBoard(game);
    await msg.reply({
      image: boardImg,
      caption: `🎮 *Game dimulai!* (Tema: ${game.themeName})\nToken: ${myToken}\nGiliran pertama: ${game.getPlayerName(firstPlayer)}\nKetik *${match[1]} shake* untuk kocok dadu.`,
      mentions: game.getMentions()
    }, true, { ephemeralExpiration: 86400, quoted: null});
    return;
  }

  // --- EXIT ---
  if (command === 'exit' || command === 'cancel') {
    let game = null, myToken = null;
    for (let [token, g] of games.entries()) {
      if (g.players.some(p => p.id === senderJid)) {
        game = g;
        myToken = token;
        break;
      }
    }
    if (!game) return msg.reply({ text: '❌ Kamu tidak dalam sesi game.', mentions: [senderJid] });
    if (game.creator !== senderJid) return msg.reply({ text: '❌ Hanya pembuat game yang bisa hapus sesi.', mentions: [senderJid] });

    games.delete(myToken);
    await saveGames();
    return msg.reply({ text: `🚫 Sesi game *${myToken}* dihapus.`, mentions: [senderJid] });
  }

  // --- SHAKE ---
  if (command === 'shake' || command === 'kocok') {
    let game = null, myToken = null;
    for (let [token, g] of games.entries()) {
      if (g.players.some(p => p.id === senderJid)) {
        game = g;
        myToken = token;
        break;
      }
    }
    if (!game) return msg.reply({ text: '❌ Kamu tidak dalam sesi game.', mentions: [senderJid] });
    if (game.status !== 'playing') return msg.reply({ text: '❌ Game belum dimulai atau sudah selesai.', mentions: [senderJid] });

    const currentPlayer = game.players[game.currentTurn];
    if (currentPlayer.id !== senderJid && !currentPlayer.isBot) {
      return msg.reply({
        text: `⏳ Bukan giliranmu! Giliran ${game.getPlayerName(currentPlayer)}.`,
        mentions: [senderJid, ...game.getMentions()]
      });
    }
    if (currentPlayer.isBot) {
      return msg.reply({ text: '🤖 Giliran bot, bot akan bergerak otomatis.', mentions: [senderJid] });
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    const oldPos = currentPlayer.position;
    const { newPos, message: specialMsg } = game.movePlayer(game.currentTurn, dice);
    let moveMsg = `${game.getPlayerName(currentPlayer)} mendapat dadu ${dice}, bergerak dari ${oldPos} → ${newPos}.`;
    if (specialMsg) moveMsg += ` ${specialMsg}`;

    const diceSticker = await getDiceSticker(dice);
    await msg.reply({ sticker: diceSticker, mentions: game.getMentions() }, true, { ephemeralExpiration: 86400, quoted: null});

    if (game.isWin(game.currentTurn)) {
      games.delete(myToken);
      await saveGames();
      const finalBoard = await renderBoard(game);
      return msg.reply({
        image: finalBoard,
        caption: `🎉 *${game.getPlayerName(currentPlayer)} MENANG!* 🎉\n${moveMsg}\nGame selesai.`,
        mentions: game.getMentions()
      }, true, { ephemeralExpiration: 86400, quoted: null});
    }

    game.nextTurn();
    await saveGames();
    const nextPlayer = game.players[game.currentTurn];
    const boardImg = await renderBoard(game);
    await msg.reply({
      image: boardImg,
      caption: `${moveMsg}\n\nGiliran berikutnya: ${game.getPlayerName(nextPlayer)}`,
      mentions: game.getMentions()
    }, true, { ephemeralExpiration: 86400, quoted: null});

    if (nextPlayer.isBot) {
      await botTurn(conn, game, myToken, match[1], { chat: chatId, reply: msg.reply, sender: msg.sender });
    }
    return;
  }

  return msg.reply({
    text: '❌ Perintah: create [tema] [solo], join <token>, start, exit, shake, theme, preview <tema>',
    mentions: [senderJid]
  });
}

export function help() {
  return `
🎲 *CARA BERMAIN Ular Tangga* 🎲

*Perintah:*
.ut atau .ulartangga

*Membuat Game:*
.ut create [nama_tema] [solo]
  - nama_tema: classic / mini (jika kosong, random)
  - solo: tambahkan kata 'solo' untuk bermain melawan bot

*Bergabung:*
.ut join <token>

*Memulai:*
.ut start (hanya pembuat game)

*Mengocok Dadu:*
.ut shake

*Membatalkan Game:*
.ut exit (hanya pembuat)

*Melihat Tema:*
.ut theme

*Preview Papan:*
.ut preview <nama_tema>

*Aturan:*
- Pemain mulai di kotak 1
- Dadu 1-6, bergerak maju sesuai angka
- Jika melebihi 100, tidak bergerak
- Ular: turun, Tangga: naik
- Pemain pertama mencapai kotak 100 menang

*Mode Solo:* Bermain melawan bot. Bot akan bergerak otomatis.

Selamat bermain!
  `;
}

// Inisialisasi
async function init() {
  await loadThemes();
  await loadGames();
}
init().catch(console.error);