import axios from 'axios';
import * as cheerio from 'cheerio';

// Mapping shorthand ke nama stat (dari array yang sudah dioptimalkan)
// Mapping batas positif dan negatif stat [short, long, max, min]
const stats_list = [
	// Attack
	["atk", ["ATK", 32, 32]],
	["atk%", ["ATK%", 16, 16]],
	["matk", ["MATK", 32, 32]],
	["matk%", ["MATK%", 16, 16]],
	["stab", ["Stability%", 7, 7]],
	["pp", ["PhysicalPierce %", 9, 9]],
	["mpp", ["Magic Pierce %", 9, 9]],
	
	// Critical
	["cr", ["Critical Rate", 32, 20]],
	["cr%", ["Critical Rate%", 32, 20]],
	["cd", ["Critical Damage", 24, 24]],
	["cd%", ["Critical Damage%", 12, 12]],
	
	// Speed
	["aspd", ["ASPD", 32, 32]],
	["aspd%", ["ASPD%", 22, 22]],
	["cspd", ["CSPD", 32, 32]],
	["cspd%", ["CSPD%", 22, 22]],
	
	// Stats
	["str", ["STR", 32, 32]],
	["str%", ["STR%", 10, 10]],
	["int", ["INT", 32, 32]],
	["int%", ["INT%", 10, 10]],
	["vit", ["VIT", 32, 32]],
	["vit%", ["VIT%", 10, 10]],
	["agi", ["AGI", 32, 32]],
	["agi%", ["AGI%", 10, 10]],
	["dex", ["DEX", 32, 32]],
	["dex%", ["DEX%", 10, 10]],
	
	// HP/MP
	["hp", ["MaxHP", 32, 32]],
	["hp%", ["MaxHP%", 14, 14]],
	["mp", ["MaxMP", 21, 15]],
	["nhpr", ["Natural HP regen", 32, 32]],
	["nhpr%", ["Natural HP regen%", 10, 10]],
	["nmpr", ["Natural MP regen", 16, 16]],
	["nmpr%", ["Natural MP regen%", 5, 5]],
	
	// Defense
	["def", ["DEF", 32, 32]],
	["def%", ["DEF%", 14, 14]],
	["mdef", ["MDEF", 32, 32]],
	["mdef%", ["MDEF%", 14, 14]],
	["pres", ["PhysicalResistance %", 14, 14]],
	["mres", ["Magic Resistance %", 14, 14]],
	["rdg_foe", ["% Reduce Dmg (Foe Epicenter)", 12, 0]],
	["rdg_player", ["% Reduce Dmg (Player Epicenter)", 12, 0]],
	["rdg_line", ["% Reduce Dmg (Straight Line)", 12, 0]],
	["rdg_charge", ["% Reduce Dmg (Charge)", 12, 0]],
	["rdg_meteor", ["% Reduce Dmg (Meteor)", 12, 0]],
	["rdg_bullet", ["% Reduce Dmg (Bullet)", 12, 0]],
	["rdg_bowling", ["% Reduce Dmg (Bowling)", 12, 0]],
	["rdg_floor", ["% Reduce Dmg (Floor)", 12, 0]],
	
	// Accuracy
	["acc", ["Accuracy", 18, 18]],
	["acc%", ["Accuracy %", 7, 7]],
	
	// Dodge
	["dodge", ["Dodge", 18, 18]],
	["dodge%", ["Dodge %", 7, 7]],
	
	// Elements - Stronger Against
	["dtefire", ["% Stronger Against Fire", 24, 24]],
	["dtewater", ["% Stronger Against Water", 24, 24]],
	["dtewind", ["% Stronger Against Wind", 24, 24]],
	["dteearth", ["% Stronger Against Earth", 24, 24]],
	["dtelight", ["% Stronger Against Light", 24, 24]],
	["dtedark", ["% Stronger Against Dark", 24, 24]],
	
	// Elements - Resistance
	["rtefire", ["Fire Resistance %", 28, 28]],
	["rtewater", ["Water Resistance %", 28, 28]],
	["rtewind", ["Wind Resistance %", 28, 28]],
	["rteearth", ["Earth Resistance %", 28, 28]],
	["rtelight", ["Light Resistance %", 28, 28]],
	["rtedark", ["Dark Resistance %", 28, 28]],
	
	// Special
	["ailment", ["Ailment Resistance %", 7, 7]],
	["guard", ["Guard Power", 7, 5]],
	["guard_rate", ["Guard Rate %", 7, 5]],
	["eva", ["Evasion Rate %", 7, 5]],
	["aggro", ["Aggro %", 21, 15]]
];
const shortToStat = new Map(stats_list);

/**
 * Parsing input string menjadi array stats (positif dan negatif)
 * Format: dipisah koma, tiap token: [sign]shorthand[=level] atau [sign]shorthand[level]
 * sign: '+' atau '-' (default '+'), level: angka atau 'MAX' (default MAX)
 * Contoh: "atk%12,str,-mpp,acc%=-7"
 * @param {string} text 
 * @returns {{ positive: Array<{name:string, level:string|number}>, negative: Array<{name:string, level:string|number}> }}
 */
function parseInput(text) {
	const positive = [];
	const negative = [];
	const usedShorthands = new Set();

	// Pecah berdasarkan koma, lalu trim spasi
	const tokens = text.trim().split(/,\s*/).filter(Boolean);
	
	for (let token of tokens) {
		// Regex: tanda opsional (+/-), lalu shorthand (huruf, %, ',), lalu optional '=' atau ':' atau spasi, lalu optional angka atau MAX
		const match = token.match(/^([+-]?)([a-z%']+)(?:[=:\s]*(\d+|MAX))?$/i);
		if (!match) {
			throw new Error(`Token "${token}" nggak kebaca nih. Coba periksa lagi penulisannya`);
		}
		let [, sign, short, levelStr] = match;
		const isPositive = sign !== '-'; // jika tidak ada tanda atau '+', berarti positif
		if (!shortToStat.has(short)) {
			throw new Error(`Shorthand "${short}" belum terdaftar. Pakai shorthand yang tersedia ya.\nLihat di \`.fsarm list\``);
		}
		if (usedShorthands.has(short)) {
			throw new Error(`Shorthand "${short}" kepake 2 kali. Hapus salah satunya biar gak tabrakan`);
		}
		usedShorthands.add(short);
		
		let level = 'MAX';
		if (levelStr !== undefined) {
			if (levelStr === 'MAX') level = 'MAX';
			else {
				const num = parseInt(levelStr, 10);
				if (isNaN(num)) throw new Error(`Level "${levelStr}" salah format. Masukkan angka aja atau kosong biar jadi 'MAX' Lv.`);
				level = num;
			}
		}

		
		const [statName, maxPositif, maxNegatif] = shortToStat.get(short);
		const maxstat = isPositive ? maxPositif : maxNegatif

		if (level != 'MAX' && level > maxstat)
			throw new Error(`Level "${levelStr}" melebihi batas. Stat ${short} max di Lv.${sign}${maxstat}`)

		if (isPositive) {
			positive.push({ name: statName, level });
		} else {
			negative.push({ name: statName, level });
		}
	}
	
	const total = positive.length + negative.length;
	if (total > 8) {
		throw new Error(`Total stat melebihi 8 (${total} stat)`);
	}
	return { positive, negative };
}

/**
 * Membangun parameter URLSearchParams dari hasil parsing dan nilai fixed.
 * @param {{ positive: Array, negative: Array }} parsed 
 * @returns {URLSearchParams}
 */
function buildPostParams(pot, parsed) {
	const params = new URLSearchParams();
	
	// Fixed & hidden
	params.append('csrf_token', '');
	params.append('properBui', 'Armor');
	params.append('send_token', '');
	params.append('sendData', 'Submit');
	
	// Basic settings
	params.append('paramLevel', '320');
	params.append('shokiSenzai', pot||110);
	params.append('kisoSenzai', '15');
	params.append('jukurendo', '270');
	
	// Material knowledge
	params.append('rikaiKinzoku', '10');
	params.append('rikaiNunoti', '10');
	params.append('rikaiKemono', '10');
	params.append('rikaiMokuzai', '10');
	params.append('rikaiYakuhin', '10');
	params.append('rikaiMaso', '10');
	
	// Positive stats (7 slot)
	for (let i = 0; i < 7; i++) {
		const stat = parsed.positive[i];
		params.append(`plusProperList[${i}].properName`, stat ? stat.name : '');
		params.append(`plusProperList[${i}].properLvHyoji`, stat ? String(stat.level) : 'MAX');
	}
	
	// Negative stats (7 slot)
	for (let i = 0; i < 7; i++) {
		const stat = parsed.negative[i];
		params.append(`minusProperList[${i}].properName`, stat ? stat.name : '');
		params.append(`minusProperList[${i}].properLvHyoji`, stat ? String(stat.level) : 'MAX');
	}
	
	return params;
}

/**
 * Fungsi utama: menerima input text statting, melakukan POST, mengembalikan response body.
 * @param {string} pot - nilai potensial zirah. default: 110
 * @param {string} inputText - Contoh: "matk%12,int%10,cd,cr,-pp,-acc%,acc=18"
 * @returns {Promise<string>} HTML response dari server
 */
async function postStattingFromInput(pot, inputText) {
	try {
		const parsed = parseInput(inputText);
		const params = buildPostParams(pot, parsed);
		const url = 'https://tanaka0.work/en/BouguProper'; // tanpa #output
		
		const response = await axios.post(url, params, {
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			timeout: 15000
		});
		return response.data; // body HTML
	} catch (error) {
		throw new Error(`Request failed: ${error.message}`);
	}
}

// ini contoh penggunaan ya..
/*
(async () => {
	const input = "matk%12,int%10,cd,cr,-pp,-acc%,acc=18";
	try {
		const html = await postStattingFromInput(input);
		console.log("Response:\n", formatResult(html));
		// Extract result menggunakan cheerio jika perlu
	} catch (err) {
		console.error(err);
	}
})();
*/

function formatResult(html) {
	const $ = cheerio.load(html);
	let result = '';
	
	// --- Selectors ---
	const part1 = $('div:contains("Result")').last();
	const part2 = $('div:contains("Compassion")').last();
	const part3 = $('div:contains("Steps")').last();
	
	result += '*Statting of Armor*\n';
	
	// --- Part 2: Mat cost ---
	result += '==========\n*Mat cost*\n';
	
	if (part2.length) {
		const raw = part2.text().split(/\n+/)[4]?.trim() || '';
		const matCost = raw
		 .split(/pt\s*,?\s*/)
		 .filter(item =>!/:0$/.test(item) && item.trim())
		 .map(a => `- ${a}pt`)
		 .join('\n');
		result += matCost + '\n';
	}
	
	result += '==========\n';
	
	// --- Part 3: Steps ---
	if (part3.length) {
		const stepsText = part3.text().trim();
	
		// Ambil header "Success Rate:60% Steps..."
		const header = stepsText.match(/([^@]*)(Steps.*\(Original Potential：\d+pt\))/);
		if (header) {
			result += `*${header[1].trim()}*\n---------- ${header[2].replace(/\s*\(/,' (').trim()}\n`;
		}
	
		// Split steps pakai regex, keep delimiter
		const steps = stepsText.split(/(?=\d+\.)/).slice(1);
	
		steps.forEach(step => {
			const clean = step.trim().replace(/\s*\n\s*/g, ' ');
			result += `${clean.replace('（Remaining', '\n----------（Remaining')}\n`;
		});
	}
	
	// --- Part 1 Result section ---
	if (part1.length) {
		result += '==========\n*Result:*\n';
	
		const htmlPart1 = part1.html();
		const resultText = htmlPart1
		 .split(/<b>Statting of Armor<\/b><br\s*\/?>/i)[1]
		 .replace(/<br\s*\/?>/gi, '\n')
		 .trim();
	
		const lines = resultText.split('\n').filter(Boolean);
		lines.forEach(line => {
			line.split(/,\s*/).forEach(item => {
				if (item.trim()) result += `- ${item.trim()}\n`;
			});
			result += '----------\n';
		});
	}
	
	return result
}

export default { stats_list, postStattingFromInput, formatResult, shortToStat }
export { stats_list, postStattingFromInput, formatResult, shortToStat }
