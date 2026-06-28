import csv from './utils/csv.js'
export class ToramLevelSystem {
	// --- rumus level ---
	static toNextLevel(Y) {
		const result = (Y ** 4) / 40 + 2 * Y - 93 / 400;
		return Math.round(result);
	}

	static totalXp(X) {
		const result = (X ** 5) / 200 - (X ** 4) / 80 + (X ** 3) / 120 + X ** 2 - (37 / 30) * X;
		return Math.round(result);
	}

	static xpToLevel(xp) {
		if (xp < 0) return 1;
		let low = 1, high = 10000;
		while (low < high) {
			const mid = Math.ceil((low + high) / 2);
			if (ToramLevelSystem.totalXp(mid) <= xp) low = mid;
			else high = mid - 1;
		}
		return low;
	}

	static getProgress(xp) {
		const level = ToramLevelSystem.xpToLevel(xp);
		const xpForCurrentLevel = ToramLevelSystem.totalXp(level);
		const xpForNextLevel = ToramLevelSystem.totalXp(level + 1);

		const currentXp = xp - xpForCurrentLevel;
		const neededXp = xpForNextLevel - xpForCurrentLevel;
		const percent = (currentXp / neededXp) * 100;

		return {
			level: level,
			currentXp: currentXp,
			neededXp: neededXp,
			remainingXp: neededXp - currentXp,
			percent: parseFloat(percent.toFixed(2)),
			totalXp: xp
		};
	}

	static getProgressBar(xp, length = 20) {
		const p = ToramLevelSystem.getProgress(xp);
		const filled = Math.floor(p.percent / 100 * length);
		const empty = length - filled;
		return `Level ${p.level} | ${p.percent}% [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${p.currentXp}/${p.neededXp} XP`;
	}

	static addXp(currentXp, gain) {
		const before = ToramLevelSystem.getProgress(currentXp);
		const newTotalXp = currentXp + gain;
		const after = ToramLevelSystem.getProgress(newTotalXp);

		return {
			before: before,
			after: after,
			levelUp: after.level > before.level,
			levelsGained: after.level - before.level,
			xpGained: gain
		};
	}

	// ===================== KONVERTER CSV =====================
	/**
	 * @param {string} csvString - Isi file CSV
	 * @returns {Array} daftar quest dengan properti:
	 *   id, bab, namaBab, subBab, namaMisi, exp, kebutuhanMisi, hadiahItem, catatan, skipable
	 */
	static parseQuestsFromCSV(csvString) {
		const lines = csv.parse(csvString, { hasHeader: false });
		if (lines.length < 2) return [];

		// Cari baris header utama (kolom: 章,名稱,節,名稱,經驗值,經驗值(不同),任務需求,物品報酬,備註1)
		let headerIndex = -1;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes("章") && lines[i].includes("節") && lines[i].includes("經驗值")) {
				headerIndex = i;
				break;
			}
		}
		if (headerIndex === -1) throw new Error("Header CSV tidak ditemukan");

		const headerRow = lines[headerIndex];
		const idxBab = headerRow.indexOf("章");
		const idxNamaBab = headerRow.indexOf("名稱");
		const idxSubBab = headerRow.indexOf("節");
		const idxNamaMisi = headerRow.indexOf("名稱", idxNamaBab + 1); // nama misi setelah nama bab
		const idxExp = headerRow.indexOf("經驗值");
		const idxExpDiff = headerRow.indexOf("經驗值(不同)");
		const idxKebutuhan = headerRow.indexOf("任務需求");
		const idxHadiah = headerRow.indexOf("物品報酬");
		const idxCatatan = headerRow.indexOf("備註1");
	
		const result = [];
		let currentBab = null;
		let currentNamaBab = '';
		let lastSubBab = 0; // buat handle subbab kosong
		const skipCounter = {}; // key: `${bab}.${subBab}` buat nomor urut skip
	
		// Loop data dari baris setelah header
		for (let i = headerIndex + 1; i < lines.length; i++) {
			const row = lines[i];
			if (row.length === 0 ||!row[idxBab] &&!row[idxNamaMisi]) continue; // skip baris kosong
	
			// Update bab kalo ada
			if (row[idxBab]) {
				// Akhir Quest Utama 
				if (row[idxBab] === '支線任務') break
				currentBab = parseInt(row[idxBab]) || currentBab;
				currentNamaBab = row[idxNamaBab] || currentNamaBab;
				lastSubBab = 0; // reset sub tiap ganti bab
			}
	
			const subBabStr = row[idxSubBab];
			const expDiff = row[idxExpDiff];
			const skipable = expDiff === 'skip';
	
			let subBab, id;
	
			if (subBabStr) {
				// Ada sub bab normal
				subBab = parseInt(subBabStr);
				lastSubBab = subBab;
				id = `${currentBab}.${subBab}`;
			} else if (skipable) {
				// Sub bab kosong + skip = pake subBab sebelumnya + counter
				const key = `${currentBab}.${lastSubBab}`;
				skipCounter[key] = (skipCounter[key] || 0) + 1;
				subBab = lastSubBab; // tetep pake subBab sebelumnya
				id = `${currentBab}.${lastSubBab}.${skipCounter[key]}`;
			} else {
				// Skip baris ga jelas
				continue;
			}
	
			result.push({
				id,
				bab: currentBab,
				namaBab: currentNamaBab,
				subBab: subBab,
				namaMisi: row[idxNamaMisi] || '',
				exp: parseInt(row[idxExp]) || 0,
				kebutuhanMisi: row[idxKebutuhan] || '',
				hadiahItem: row[idxHadiah] || '',
				catatan: row[idxCatatan] || '',
				skipable
			});
		}
	
		return result;
	}
	
	// ===================== PERHITUNGAN PROGRESS MQ =====================
	/**
	 * Hitung progress setelah menyelesaikan serangkaian quest dari startId sampai endId (inklusif)
	 * @param {number} startLevel - Level awal
	 * @param {number} currentXPPercent - Persen progress di level awal (0-100)
	 * @param {string} startQuestId - Id quest pertama (contoh "9.3")
	 * @param {string} endQuestId - Id quest terakhir (contoh "15")
	 * @param {string[]} skipQuestIds - Id quest yang di-skip (harus memiliki skipable=true)
	 * @param {Array} quests - Daftar quest dari parseQuestsFromCSV
	 * @returns {Object} Hasil perhitungan lengkap
	 */
	static calculateMQProgress(startLevel, currentXPPercent, startQuestId, endQuestId, skipQuestIds = [], quests) {
		// Hitung XP awal
		const xpForLevel = this.totalXp(startLevel);
		const xpToNext = this.totalXp(startLevel + 1) - xpForLevel;
		const currentXp = xpForLevel + Math.floor(xpToNext * (currentXPPercent / 100));
		const fromLevel = this.getProgress(currentXp);

		// Cari indeks quest start dan end
		const allIds = quests.map(q => q.id);
		const startIdx = allIds.indexOf(startQuestId);
		const endIdx = allIds.indexOf(endQuestId);
		if (startIdx === -1) throw new Error(`Quest start ${startQuestId} tidak ditemukan`);
		if (endIdx === -1) throw new Error(`Quest end ${endQuestId} tidak ditemukan`);
		if (startIdx > endIdx) throw new Error("Quest start setelah quest end");

		// Ambil quest dalam range
		const selectedQuests = quests.slice(startIdx, endIdx + 1);
		// Filter skip
		const filteredQuests = selectedQuests.filter(q => !skipQuestIds.includes(q.id) || (skipQuestIds.includes(q.id) && !q.skipable));
		for (const skipId of skipQuestIds) {
			const q = quests.find(q => q.id === skipId);
			if (q && !q.skipable) throw new Error(`Quest ${skipId} tidak bisa di-skip`);
			if (!selectedQuests.some(sq => sq.id === skipId)) throw new Error(`Quest skip ${skipId} tidak berada dalam range`);
		}

		// Total XP
		const totalXP = filteredQuests.reduce((sum, q) => sum + q.exp, 0);
		// Kelompokkan per bab untuk laporan perolehan
		const babMap = new Map();
		for (const q of filteredQuests) {
			if (!babMap.has(q.bab)) {
				babMap.set(q.bab, { bab: q.bab, totalXp: 0, quests: [] });
			}
			babMap.get(q.bab).totalXp += q.exp;
			babMap.get(q.bab).quests.push(q);
		}
		const perolehan = Array.from(babMap.values()).map(b => ({
			bab: b.bab,
			totalXp: b.totalXp,
			persenDariTotal: totalXP > 0 ? parseFloat((b.totalXp / totalXP * 100).toFixed(2)) : 0,
			daftarQuest: b.quests
		})).sort((a, b) => a.bab - b.bab);

		// Hitung level setelah MQ
		const afterXp = currentXp + totalXP;
		const toLevel = this.getProgress(afterXp);

		return {
			totalXP,
			from_level: {
				level: fromLevel.level,
				xp: fromLevel.currentXp,
				neededXp: fromLevel.neededXp,
				progress: fromLevel.percent,
				totalXp: currentXp
			},
			to_level: {
				level: toLevel.level,
				xp: toLevel.currentXp,
				neededXp: toLevel.neededXp,
				progress: toLevel.percent,
				totalXp: afterXp
			},
			perolehan,
			activeQuests: filteredQuests,
			skipedQuests: skipQuestIds
		};
	}

	// ===================== PARSER COMMAND .mq =====================
	/**
	 * Parsing input string seperti ".mq 150 20% 9.3 15" atau ".mq 150 20% 9.3 15 skip"
	 * @param {string} input - Command string
	 * @param {Array} quests - Daftar quest dari CSV
	 * @returns {Object} Parameter untuk calculateMQProgress
	 */
	static parseMQCommand(input, quests) {
		const args = input.trim().split(/\s+/);
		if (args[0]!== '.mq' || args.length < 5) {
			throw new Error('Format:.mq <level> <persen%> <start> <end> [skip_venena]');
		}

		const level = parseInt(args[1]);
		const percent = parseFloat(args[2]); // "20%" -> 20
		if (isNaN(level) || isNaN(percent)) {
			throw new Error('Level dan persen harus angka');
		}

		// Helper: resolve "9" jadi "9.1", "9.3" tetap "9.3", "9.3.1" tetap "9.3.1"
		const resolveQuestId = (inputId) => {
			// Coba exact match dulu
			const exact = quests.find(q => q.id === inputId);
			if (exact) return exact.id;

			// Kalo input cuma angka bab: "9" -> cari misi pertama bab 9
			if (/^\d+$/.test(inputId)) {
				const bab = parseInt(inputId);
				const first = quests.find(q => q.bab === bab);
				if (!first) throw new Error(`Bab ${bab} tidak ditemukan`);
				return first.id;
			}

			// Format bab.sub: "9.3" udah kehandle di exact match
			// Kalo ga ketemu, throw
			throw new Error(`Quest ID ${inputId} tidak ditemukan`);
		};

		// Helper: resolve "15" jadi misi terakhir bab 15
		const resolveEndId = (inputId) => {
			// Exact match dulu
			const exact = quests.find(q => q.id === inputId);
			if (exact) return exact.id;

			// Kalo input cuma angka bab: "15" -> cari misi terakhir bab 15
			if (/^\d+$/.test(inputId)) {
				const bab = parseInt(inputId);
				const last = [...quests].reverse().find(q => q.bab === bab);
				if (!last) throw new Error(`Bab ${bab} tidak ditemukan`);
				return last.id;
			}

			throw new Error(`Quest ID ${inputId} tidak ditemukan`);
		};
	
		const startId = resolveQuestId(args[3]);
		const endId = resolveEndId(args[4]);

		// Validasi urutan
		const startIdx = quests.findIndex(q => q.id === startId);
		const endIdx = quests.findIndex(q => q.id === endId);
		if (startIdx === -1 || endIdx === -1) throw new Error('Start/End ID invalid');
		if (startIdx > endIdx) throw new Error('Start harus sebelum End');

		const skipIds = /^skip(.?venena)?|y(es|a)?$/i.test(args[5])
			 ? ['9.9.1']
			 : []

		/* soon will be applyes
		// SkipIds: bisa "10", "12.1", "12.3.1"
		const skipIds = [];
		for (let i = 5; i < args.length; i++) {
			const skipInput = args[i];
			if (/^\d+$/.test(skipInput)) {
				// "10" = skip 1 bab penuh
				const bab = parseInt(skipInput);
				quests.filter(q => q.bab === bab).forEach(q => skipIds.push(q.id));
			} else {
				// "12.1" atau "12.3.1" = exact
				const quest = quests.find(q => q.id === skipInput);
				if (!quest) throw new Error(`Skip ID ${skipInput} tidak ditemukan`);
				skipIds.push(quest.id);
			}
		}
		*/
		return { level, percent, startId, endId, skipIds };
	}

	// ===================== OUTPUT TEKS INFORMATIF =====================
	/**
	 * Menghasilkan teks seru dan informatif dari hasil calculateMQProgress
	 * @param {Object} result - Hasil dari calculateMQProgress
	 * @param {boolean} detail - 'Apakah perlu rincian perolehan?
	 * @returns {string} Teks untuk ditampilkan
	 */
	static formatMQResult(result, detail) {
		const levelGain = result.to_level.level - result.from_level.level;
		const skip = result.skipedQuests.length; // Asumsikan hanya quest venena yang bisa dilewat
		
		return [
		// '⚔️ ========== HASIL SIMULASI MQ ========== ⚔️',
		`📊 Total XP yang akan diperoleh: ${result.totalXP.toLocaleString()} XP`,
		'',
		`🌟 Sebelum MQ: Level ${result.from_level.level} (${result.from_level.progress}%)`, // - ${result.from_level.xp.toLocaleString()}/${result.from_level.neededXp.toLocaleString()} XP)`,
		`🚀 Setelah MQ: Level ${result.to_level.level} (${result.to_level.progress}%)`, // - ${result.to_level.xp.toLocaleString()}/${result.to_level.neededXp.toLocaleString()} XP)`,
		`✨ Kenaikan level: ${levelGain} level ✨`,
		result.activeQuests.find(q => q.bab == 9 && q.subBab == 9)
			 ? `\n${skip ? '🚫' : '✅'} Bonus EXP Quest Venena *${skip ? 'dilewatkan' : 'diperoleh'}*`
			 : '',
		...(detail?[
		'📋 Rincian per Bab:',
		result.perolehan.map( bab => {
			result = `   🧩 Bab ${bab.bab} : ${bab.totalXp.toLocaleString()} XP (${bab.persenDariTotal}%)`// dari total MQ)`
			// Tampilkan quest yang mengandung kebutuhan/hadiah/catatan menarik
			const questsDenganInfo = bab.daftarQuest.filter(q => q.kebutuhanMisi || q.hadiahItem || q.catatan);
			for (const q of questsDenganInfo) {
				let info = `\n      - ${q.namaMisi} (${q.id})`;
				if (q.kebutuhanMisi) info += ` | 🗒️ Butuh: ${q.kebutuhanMisi}`;
				if (q.hadiahItem) info += ` | 🎁 Hadiah: ${q.hadiahItem}`;
				if (q.catatan) info += ` | 📝 Catatan: ${q.catatan}`;
				result += info
			}
			return result
		}).join('\n')] : ['*Tips:* gunakan `.guide bahan mq` untuk list bahan MQ.']),
		'',
		shake(quotes)
		].join("\n");
	}

	// ===================== COMMAND PROCESSOR SATU LANGKAH =====================
	/**
	 * Proses command .mq langsung menghasilkan teks output
	 * @param {string} command - Input command
	 * @param {string} csvString - Isi file CSV quest
	 * @returns {string} Teks hasil
	 */
	static processMQCommand(command, csvString) {
		const quests = this.parseQuestsFromCSV(csvString);
		const { level, percent, startId, endId, skipIds } = this.parseMQCommand(command, quests);
		const result = this.calculateMQProgress(level, percent, startId, endId, skipIds, quests);
		return this.formatMQResult(result);
	}
}

export default ToramLevelSystem;

const quotes = [
	"🔥 Selamat berpetualang, jangan lupa bawa bekal yang cukup! 🔥",
	"⚔️ Monster kuat bukan buat ditakutin, tapi buat ditaklukin. Gas gacha drop! ⚔️",
	"🗺️ Jalan lurus doang ga seru. Sesekali nyasar biar dapet hidden quest! 🗺️",
	"🎒 EXP sama Spina ga bakal ngumpul kalo cuma diem di Sofya. Gaskan farming! 🎒",
	"💎 Armor +S itu hasil keringat, bukan hasil ngeluh. Tempa terus sampe pecah! 💎",
	"🌙 Malam makin larut, boss makin galak. Siapin Revita sebelum mati konyol! 🌙",
	"🏹 Panah meleset itu biasa. Yang penting jangan nyerah sebelum boss rata! 🏹",
	"🍖 Party bubar bukan akhir segalanya. Solo player juga bisa jadi legenda! 🍖"
]

function shake(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}