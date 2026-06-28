import fs from 'fs';
import path from 'path';
import db from '../../utils/session/db.js';

// ===============================
//	ACTION REGISTRY (Middleware)
// ===============================
const ActionRegistry = {
	// === EXISTING MIDDLEWARE ===
	checkSanity: (context) => {
		const params = context.params;
		if (context.option.action === 'combat' && context.player.sanity < params.threshold) {
			return { cancel: true, message: params.cancelMsg || 'Kamu terlalu takut untuk bertarung.' };
		}
		return null;
	},

	checkSin: (context) => {
		const params = context.params;
		if ((context.player.stats.dosa || 0) >= params.threshold) {
			return { cancel: true, message: params.cancelMsg || 'Dosamu terlalu besar, Tuhan menghukummu.' };
		}
		return null;
	},

	appendText: (context) => {
		context.response += context.params.text;
		return context;
	},

	modifyStats: (context) => {
		const params = context.params;
		Object.entries(params).forEach(([stat, delta]) => {
			context.player.modifyStat(stat, delta);
		});
		return context;
	},

	giveItem: (context) => {
		const params = context.params;
		const player = context.player;
		if (params.item) player.addItem(params.item);
		if (params.statMod) {
			Object.entries(params.statMod).forEach(([stat, val]) => player.modifyStat(stat, val));
		}
		return { message: params.message || `Kamu mendapat ${params.item || 'item'}!` };
	},

	jumpToNode: (context) => {
		const params = context.params;
		context.session.currentNode = params.node;
		return { message: params.message || '' };
	},

	reduceTime: (context) => {
		const params = context.params;
		if (context.session.timeLeft !== undefined) {
			context.session.timeLeft -= params.amount || 5;
			if (context.session.timeLeft <= 0) context.session.gameOver = true;
		}
		return null;
	},

	conditionalEnding: (context) => {
		const params = context.params;
		const dosa = context.player.stats.dosa || 0;
		const sanity = context.player.stats.sanity || 100;

		if (dosa >= (params.sinThreshold ?? 999) && sanity <= (params.sanityThreshold ?? -1)) {
			context.session.currentNode = params.badEndingNode;
			return { message: params.badMessage };
		} 
		else if (sanity >= (params.goodSanity ?? 999)) {
			context.session.currentNode = params.goodEndingNode;
			return { message: params.goodMessage };
		}
		else if (params.neutralEndingNode) {
			context.session.currentNode = params.neutralEndingNode;
			return { message: params.neutralMessage || "Kau tidak sempurna, tapi kau manusia." };
		}
		return null;
	},

	// === NEW: COIN & MANA HANDLERS ===
	modifyCoin: (context) => {
		const params = context.params;
		const delta = params.amount || 0;
		context.player.modifyStat('coin', delta);
		return { message: params.message || `${delta >= 0 ? '+' : ''}${delta} Coin` };
	},

	modifyMana: (context) => {
		const params = context.params;
		const delta = params.amount || 0;
		context.player.modifyStat('mana', delta);
		return { message: params.message || `${delta >= 0 ? '+' : ''}${delta} Mana` };
	},

	checkCoin: (context) => {
		const params = context.params;
		const playerCoin = context.player.stats.coin || 0;
		if (playerCoin < params.required) {
			return { cancel: true, message: params.cancelMsg || `Kamu butuh ${params.required} coin, tapi hanya punya ${playerCoin}.` };
		}
		return null;
	},

	checkMana: (context) => {
		const params = context.params;
		const playerMana = context.player.stats.mana || 0;
		if (playerMana < params.required) {
			return { cancel: true, message: params.cancelMsg || `Mana tidak cukup! Butuh ${params.required} mana.` };
		}
		return null;
	},

	// === SAVE/LOAD HANDLERS (opsional, bisa dipanggil via special action) ===
	saveGame: async (context) => {
		const result = await context.session.sessionManager.save();
		return { message: result.message };
	},

	loadGame: async (context) => {
		// Untuk load via special, biasanya butuh input ID, jadi lebih baik via command line
		return { message: "Gunakan perintah /load <save_id> untuk memuat game." };
	}
};

// ===============================
//	RulesManager Class
// ===============================
class RulesManager {
	static registry = [];
	static rulesCache = new Map();

	// Panggil ini sekali pas app start
	static loadRegistry(registryPath = 'rules_registry.json') {
		try {
			const fullPath = path.resolve(registryPath);
			if (!fs.existsSync(fullPath)) {
				throw new Error(`rules_registry.json tidak ditemukan di ${fullPath}`);
			}
			const raw = fs.readFileSync(fullPath, 'utf-8');
			
			// untuk mendukung parseChoice, tambahkan 'text'
			this.registry = JSON.parse(raw) .map (({ title, src })=>({ title, text: title, src }));
			
			// console.log(`[RulesManager] Loaded ${this.registry.length} game(s)`);
		} catch (err) {
			// console.error('[RulesManager] Gagal load registry:', err.message);
			this.registry = [];
		}
	}

	static getGameConfig(title) {
		return Session.parseChoice(title, this.registry).option
	}

	static loadRules(title) {
		title = Session.parseChoice(title, this.registry).option?.title
		
		if (this.rulesCache.has(title)) {
			return this.rulesCache.get(title);
		}

		const config = this.getGameConfig(title);
		if (!config) {
			throw new Error(`Game '${title}' tidak ditemukan di registry`);
		}

		const fullPath = path.resolve(config.src);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`File rules tidak ditemukan: ${fullPath}`);
		}

		const raw = fs.readFileSync(fullPath, 'utf-8');
		const rules = JSON.parse(raw);
		
		this.rulesCache.set(title, rules);
		return rules;
	}

	static listGames() {
		return this.registry.map(g => ({ title: g.title, src: g.src }));
	}

	static reloadRegistry() {
		this.rulesCache.clear();
		this.loadRegistry();
	}
}

// ===============================
//	Player Class
// ===============================
class Player {
	constructor(stats, inventory = [], rules) {
		this.rules = rules;
		this.stats = { ...stats };
		this.inventory = [...inventory];
		this.health = this.stats.kesehatan ?? 100;
		const gameSpecific = rules.game_specific || {};
		
		// Existing
		if (gameSpecific.sanity?.enabled) {
			this.sanity = this.stats.sanity ?? gameSpecific.sanity.initial ?? 100;
		}
		if (gameSpecific.dosa?.enabled) {
			this.dosa = this.stats.dosa ?? 0;
		}
		if (gameSpecific.echo_power?.enabled) {
			this.echoPower = this.stats.echo_power ?? gameSpecific.echo_power.initial ?? 5;
		}
		
		// NEW: Coin
		if (gameSpecific.coin?.enabled) {
			this.coin = this.stats.coin ?? gameSpecific.coin.initial ?? 0;
		}
		
		// NEW: Mana
		if (gameSpecific.mana?.enabled) {
			this.mana = this.stats.mana ?? gameSpecific.mana.initial ?? 50;
			this.maxMana = gameSpecific.mana.max ?? 100;
		}
		
		this.currentLocation = rules.start_location || 'start';
		this.history = [];
	}

	modifyStat(stat, delta) {
		const maxVal = this.rules.player_stats.max?.[stat] ?? 100;
		const oldVal = this.stats[stat] ?? 0;
		let newVal = Math.min(maxVal, Math.max(0, oldVal + delta));
		this.stats[stat] = newVal;

		// Existing
		if (stat === 'kesehatan') this.health = newVal;
		if (stat === 'sanity' && this.rules.game_specific?.sanity?.enabled) this.sanity = newVal;
		if (stat === 'dosa' && this.rules.game_specific?.dosa?.enabled) this.dosa = newVal;
		if (stat === 'echo_power' && this.rules.game_specific?.echo_power?.enabled) this.echoPower = newVal;
		
		// NEW: Coin & Mana
		if (stat === 'coin' && this.rules.game_specific?.coin?.enabled) {
			this.coin = newVal;
			this.stats.coin = newVal;
		}
		if (stat === 'mana' && this.rules.game_specific?.mana?.enabled) {
			const maxMana = this.rules.game_specific.mana.max ?? 100;
			this.mana = Math.min(maxMana, Math.max(0, newVal));
			this.stats.mana = this.mana;
		}
	}

	addItem(itemId) {
		if (!this.inventory.includes(itemId)) this.inventory.push(itemId);
	}

	removeItem(itemId) {
		const idx = this.inventory.indexOf(itemId);
		if (idx > -1) this.inventory.splice(idx, 1);
	}

	hasItem(itemId) {
		return this.inventory.includes(itemId);
	}

	getWeaponDamage() {
		for (const id of this.inventory) {
			const item = this.rules.items?.find(i => i.id === id);
			if (item && item.type === 'weapon') return item.damage || 0;
		}
		return 0;
	}

	getDefense() {
		let defense = 0;
		for (const id of this.inventory) {
			const item = this.rules.items?.find(i => i.id === id);
			if (item && item.type === 'armor') defense += item.defense || 0;
		}
		return defense;
	}
}

// ===============================
//	Session Class
// ===============================
class Session {
	constructor(gameName, userId, rules = null) {
	// Load rules kalau belum dikasih
		this.rules = rules || RulesManager.loadRules(gameName);
		this.gameName = this.rules.game_info.name;
		this.gameSpecific = this.rules.game_specific || {};

		this.player = new Player({...this.rules.player_stats.base }, [], this.rules);
		this.currentNode = this.rules.start_node || 'start';
		this.gameOver = false;
		this.result = '';

		if (this.gameSpecific.time_limit?.enabled) {
			this.timeLeft = this.gameSpecific.time_limit.initial_minutes?? 60;
			this.maxTime = this.timeLeft;
			this.timeCostPerAction = this.gameSpecific.time_limit.cost_per_action?? 5;
			this.timeCostCombat = this.gameSpecific.time_limit.cost_combat?? 10;
		}

		this.userId = userId;
		if (userId) {
			this.sessionManager = SessionManager.forUser(userId);
			SessionManager.setSession(userId, this);
		}
	}

	static createNew(gameName, userId) {
		return new Session(gameName, userId);
	}

	static async loadExisting(userId) {
		const sm = SessionManager.forUser(userId);
		const res = await sm.load();
		if (!res.success) throw new Error(res.message);
		return SessionManager.getSession(userId);
	}

	_runMiddleware(stage, context) {
		const middlewares = this.rules.middleware?.[stage];
		if (!middlewares) return context;
		const actions = Array.isArray(middlewares) ? middlewares : [middlewares];
		for (const action of actions) {
			const handler = ActionRegistry[action.type];
			if (!handler) continue;
			context.params = action;
			const result = handler(context);
			delete context.params;
			if (result && result.cancel === true) {
				context.cancelled = true;
				context.cancelMessage = result.message;
				return context;
			}
			if (result && result.message !== undefined && !context.cancelled) {
				context.specialResult = result;
			}
		}
		return context;
	}

	_replacePlaceholders(text) {
		if (!text) return text;
		let result = text.replace(/{sanity}/gi, this.player.sanity ?? 0);
		result = result.replace(/{dosa}/gi, this.player.dosa ?? 0);
		result = result.replace(/{hp}/gi, this.player.health);
		result = result.replace(/{kesehatan}/gi, this.player.health);
		result = result.replace(/{timeleft}/gi, this.timeLeft ?? '?');
		result = result.replace(/{coin}/gi, this.player.coin ?? 0);
		result = result.replace(/{mana}/gi, this.player.mana ?? 0);
		for (const [stat, val] of Object.entries(this.player.stats)) {
			const regex = new RegExp(`{${stat}}`, 'gi');
			result = result.replace(regex, val ?? 0);
		}
		return result;
	}

	// ===============================
	// CHOICE PARSING
	// ===============================
	
	static parseChoice(input, options) {
		const trimmed = input.trim().toLowerCase();
		if (!trimmed) return { option: null, error: 'Input kosong.' };
	
		// Parse sebagai nomor
		const choiceIdx = parseInt(trimmed, 10) - 1;
		if (!isNaN(choiceIdx) && choiceIdx >= 0 && choiceIdx < options.length) {
			return { option: options[choiceIdx], matchType: 'number' };
		}
	
		// Exact match nama pilihan
		let exactMatch = options.find(opt => opt.text.toLowerCase() === trimmed);
		if (exactMatch) {
			return { option: exactMatch, matchType: 'exact' };
		}
	
		// Partial match - cari opsi yang text-nya mengandung input user
		let candidates = options.filter(opt =>
			opt.text.toLowerCase().includes(trimmed)
		);
	
		// Kalau 0 hasil, coba dibalik: input mengandung text opsi
		if (candidates.length === 0) {
			candidates = options.filter(opt =>
				trimmed.includes(opt.text.toLowerCase())
			);
		}
	
		// Ambil hasil
		if (candidates.length === 0) {
			return { option: null, error: 'Pilihan tidak ditemukan.' };
		}
		if (candidates.length === 1) {
			return { option: candidates[0], matchType: 'partial' };
		}
	
		// Ambiguous
		return {
			option: null,
			error: 'Pilihan ambigu.',
			candidates: candidates
		};
	}

	async processInput(playerInput) {
		if (this.gameOver) return this.result || "Game telah berakhir. Mulai sesi baru.";
		
		const node = this._getNode(this.currentNode);
		const options = node?.options ?? [];
		if (!node || options.length === 0) {
			this.gameOver = true;
			return "Perjalananmu berakhir secara misterius...";
		}
		
		const parseResult = Session.parseChoice(playerInput, node.options?? []);
	
		if (!parseResult.option) {
			let errMsg = parseResult.error;
	
			if (parseResult.error === 'Pilihan ambigu.' && parseResult.candidates) {
				errMsg += ` Maksud kamu:\n${this._formatOptions(parseResult.candidates)}`;
			} else {
				errMsg += `\nPilih:\n${this._formatOptions(node.options)}`;
			}
			return errMsg;
		}
	
		const option = parseResult.option;
		
		const context = { option, player: this.player, session: this, response: '', cancelled: false, cancelMessage: '', specialResult: null };
		const beforeResult = this._runMiddleware('beforeAction', context);
		if (beforeResult.cancelled) return this._replacePlaceholders(beforeResult.cancelMessage);
		
		let response = this._executeOption(option);
		context.response = response;
		
		if (this.gameSpecific.time_limit?.enabled && !this.gameOver) {
			let timeCost = this.timeCostPerAction;
			if (option.action === 'combat') timeCost = this.timeCostCombat;
			this._reduceTime(timeCost);
		}
		
		const afterResult = this._runMiddleware('afterAction', context);
		if (afterResult.specialResult) response = afterResult.specialResult.message || response;
		response = afterResult.response || response;
		
		if (this.gameSpecific.time_limit?.enabled && this.timeLeft <= 0 && !this.gameOver) {
			this.gameOver = true;
			response += "\n\n⏰ Waktu habis. Permainan berakhir.";
		}
		if (!this._getNode(this.currentNode)?.options?.length) {
			this.gameOver = true;
			response += "\n\n[Tamat]";
		}
		return this._replacePlaceholders(response);
	}

	_reduceTime(amount) {
		if (this.gameOver) return;
		this.timeLeft -= amount;
		if (this.timeLeft <= 0) this.timeLeft = 0;
	}

	_executeOption(option) {
		const action = option.action || 'none';
		if (action === 'move_location') {
			this.player.currentLocation = option.target;
			this.currentNode = option.next_node || 'end';
			return this._describeLocation(option.target);
		}
		if (action === 'combat') {
			const result = this._resolveCombat(option.target);
			if (result.player_won) {
				this.currentNode = option.next_node_on_win || 'end';
				return `⚔️ Kamu menang! ${result.description}\n${this._getNodeText(this.currentNode)}`;
			} else {
				this.gameOver = true;
				return `💀 Kamu kalah! ${result.description}\nGAME OVER.`;
			}
		}
		if (action === 'skill_check') {
			const result = this._skillCheck(option.skill, option.difficulty, option.mana_cost || 0);
			if (result.success) {
				this.currentNode = option.next_node_success;
				return `🎲 ${result.description}\n${this._getNodeText(this.currentNode)}`;
			} else {
				this.currentNode = option.next_node_fail;
				return `😞 ${result.description}\n${this._getNodeText(this.currentNode)}`;
			}
		}
		if (action === 'special') return this._handleSpecial(option);
		
		this.currentNode = option.next_node || 'end';
		return this._getNodeText(this.currentNode);
	}

	_handleSpecial(option) {
		const specialType = option.special_type || '';
		const specialHandlerConfig = this.rules.middleware?.specialHandlers?.[specialType];
		let resultMessage = null;
		let nodeChanged = false;
		
		if (specialHandlerConfig) {
			const handler = ActionRegistry[specialHandlerConfig.type];
			if (handler) {
				const context = { player: this.player, session: this, option, params: specialHandlerConfig };
				const result = handler(context);
				if (result && result.message) {
					resultMessage = result.message;
					if (context.session.currentNode !== this.currentNode) {
						this.currentNode = context.session.currentNode;
						nodeChanged = true;
					}
					if (option.next_node && !nodeChanged) {
						this.currentNode = option.next_node;
						nodeChanged = true;
					}
				}
			}
		}
		
		if (!resultMessage) {
			switch (specialType) {
				case 'find_needle':
					if (this.player.hasItem('jarum_jahit')) resultMessage = "Kamu sudah memiliki jarum perak.";
					else {
						this.player.addItem('jarum_jahit');
						if (this.gameSpecific.time_limit?.enabled) this._reduceTime(10);
						resultMessage = "🧵 Kamu menemukan jarum jahit perak.";
					}
					if (option.next_node) { this.currentNode = option.next_node; nodeChanged = true; }
					break;
				case 'find_medal':
					if (this.player.hasItem('medali_kehormatan')) resultMessage = "Medali sudah ada.";
					else {
						this.player.addItem('medali_kehormatan');
						if (this.gameSpecific.time_limit?.enabled) this._reduceTime(10);
						resultMessage = "🎖️ Kamu menemukan medali kehormatan.";
					}
					if (option.next_node) { this.currentNode = option.next_node; nodeChanged = true; }
					break;
				case 'bad_ending':
					this.gameOver = true;
					resultMessage = "💀 Kamu menerima takdir buruk. GAME OVER.";
					break;
				default:
					if (option.next_node) {
						this.currentNode = option.next_node;
						nodeChanged = true;
						resultMessage = null;
					} else {
						resultMessage = `Special action '${specialType}' tidak dikenali.`;
					}
			}
		}
		
		if (nodeChanged && !this.gameOver) return this._getNodeText(this.currentNode);
		if (resultMessage) return resultMessage;
		return this._getNodeText(this.currentNode);
	}

	_resolveCombat(npcId) {
		const npc = this.rules.npcs.find(n => n.id === npcId);
		if (!npc) return { player_won: false, description: 'NPC tidak ditemukan.' };
		const npcStats = npc.stats || { kesehatan: 30, kekuatan: 3, kecepatan: 3 };
		const playerStats = this.player.stats;
		const playerSpd = playerStats.kecepatan || 1;
		const npcSpd = npcStats.kecepatan || 1;
		let playerDamage = (playerStats.kekuatan || 2) + this.player.getWeaponDamage();
		let npcDamage = npcStats.kekuatan || 3;
		let playerHp = this.player.health;
		let npcHp = npcStats.kesehatan || 30;
		const playerDef = this.player.getDefense();
		let turn = 0;
		while (playerHp > 0 && npcHp > 0) {
			if (turn % 2 === 0) {
				const hitChance = playerSpd / (playerSpd + npcSpd);
				if (Math.random() < hitChance) {
					const crit = Math.random() < 0.1;
					let dmg = playerDamage * (crit ? 2 : 1);
					dmg = Math.max(1, dmg - (npcStats.defense || 0));
					npcHp -= dmg;
				}
			} else {
				const hitChance = npcSpd / (playerSpd + npcSpd);
				if (Math.random() < hitChance) {
					const crit = Math.random() < 0.1;
					let dmg = npcDamage * (crit ? 2 : 1);
					dmg = Math.max(1, dmg - playerDef);
					playerHp -= dmg;
				}
			}
			turn++;
		}
		this.player.health = playerHp;
		this.player.stats.kesehatan = playerHp;
		if (playerHp > 0) {
			return { player_won: true, description: `Setelah ${Math.floor(turn / 2)} ronde, musuh dikalahkan. Sisa HP ${playerHp}.` };
		} else {
			return { player_won: false, description: `Kamu mati setelah ${Math.floor(turn / 2)} ronde.` };
		}
	}

	_skillCheck(skill, difficulty, manaCost = 0) {
		const skillDef = this.rules.skill_checks[skill];
		if (!skillDef) return { success: false, description: 'Skill tidak dikenal.' };
		
		if (manaCost > 0 && this.gameSpecific.mana?.enabled) {
			if (this.player.mana < manaCost) {
				return { success: false, description: `✨ Mana tidak cukup! Butuh ${manaCost} mana untuk menggunakan ${skill}.` };
			}
			this.player.modifyStat('mana', -manaCost);
		}
		
		const statName = skillDef.base_stat;
		let statValue = 0;
		if (statName === 'echo_power' && this.gameSpecific.echo_power?.enabled) {
			statValue = this.player.echoPower || 0;
		} else {
			statValue = this.player.stats[statName] || 0;
		}
		const roll = Math.floor(Math.random() * 20) + 1;
		const success = roll + statValue >= difficulty;
		let description = `Roll ${roll} + ${statValue} (${statName}) vs DC ${difficulty}. ${success ? 'Berhasil!' : 'Gagal.'}`;

		// Hardcode untuk echo_listening (bisa dihapus jika sudah pakai modifiers)
		if (this.gameSpecific.sanity?.enabled && skill === 'echo_listening') {
			if (success) {
				this.player.modifyStat('sanity', this.gameSpecific.sanity.gain_on_success || 5);
				description += ` +${this.gameSpecific.sanity.gain_on_success || 5} Sanity.`;
			} else {
				this.player.modifyStat('sanity', -(this.gameSpecific.sanity.loss_on_fail || 5));
				description += ` -${this.gameSpecific.sanity.loss_on_fail || 5} Sanity.`;
			}
		}

		if (success && this.gameSpecific.mana?.enabled && skillDef.mana_regen) {
			this.player.modifyStat('mana', skillDef.mana_regen);
			description += ` +${skillDef.mana_regen} Mana.`;
		}

		// Terapkan modifiers dari skill definition
		const modifiers = success ? skillDef.on_success_modifiers : skillDef.on_fail_modifiers;
		 if (modifiers) {
				 if (modifiers.statMod) {
						 Object.entries(modifiers.statMod).forEach(([stat, delta]) => {
								 this.player.modifyStat(stat, delta);
								 description += ` ${delta >= 0 ? '+' : ''}${delta} ${stat}.`;
						 });
				 }
				 if (modifiers.giveItem) {
						 this.player.addItem(modifiers.giveItem);
						 description += ` Mendapat item: ${modifiers.giveItem}.`;
				 }
				 if (modifiers.message) {
						 description += ` ${modifiers.message}`;
				 }
		 }

		return { success, description };
	}

	_getNode(nodeId) {
		return this.rules.story_nodes?.find(n => n.id === nodeId) || null;
	}

	_getNodeText(nodeId) {
		const node = this._getNode(nodeId);
		if (!node) {
			this.gameOver = true;
			return "Node tujuan tidak ditemukan. Permainan berakhir.";
		}
		let text = node.text;
		if (this.gameSpecific.time_limit?.enabled) text += `\n⏰ Waktu tersisa: ${this.timeLeft} menit sebelum fajar.`;
		if (this.gameSpecific.sanity?.enabled) text += `\n🧠 Sanity: ${this.player.sanity}`;
		if (this.gameSpecific.dosa?.enabled) text += `\n😈 Dosa: ${this.player.dosa}`;
		text += `\n❤️ HP: ${this.player.health}`;
		if (this.gameSpecific.coin?.enabled) {
			const coinIcon = this.gameSpecific.coin.icon || '🪙';
			text += `\n${coinIcon} Coin: ${this.player.coin}`;
		}
		if (this.gameSpecific.mana?.enabled) {
			const manaIcon = this.gameSpecific.mana.icon || '✨';
			text += `\n${manaIcon} Mana: ${this.player.mana}/${this.player.maxMana}`;
		}
		const options = (node.options ?? []).map((opt, i) => `${i+1}. ${opt.text}`).join('\n');
		return `${text}\n\n${options}`;
	}

	_describeLocation(locationId) {
		const loc = this.rules.locations?.[locationId];
		if (!loc) return "Lokasi tidak dikenal.";
		let desc = `📍 ${loc.name}\n${loc.description}`;
		const npcsHere = this.rules.npcs.filter(n => n.location === locationId).map(n => n.name);
		if (npcsHere.length) desc += `\n👻 Kamu melihat: ${npcsHere.join(', ')}.`;
		if (this.gameSpecific.time_limit?.enabled) desc += `\n⏰ Waktu: ${this.timeLeft} menit`;
		if (this.gameSpecific.sanity?.enabled) desc += `\n🧠 Sanity: ${this.player.sanity}`;
		if (this.gameSpecific.dosa?.enabled) desc += `\n😈 Dosa: ${this.player.dosa}`;
		desc += `\n❤️ HP: ${this.player.health}`;
		if (this.gameSpecific.coin?.enabled) {
			const coinIcon = this.gameSpecific.coin.icon || '🪙';
			desc += `\n${coinIcon} Coin: ${this.player.coin}`;
		}
		if (this.gameSpecific.mana?.enabled) {
			const manaIcon = this.gameSpecific.mana.icon || '✨';
			desc += `\n${manaIcon} Mana: ${this.player.mana}/${this.player.maxMana}`;
		}
		const node = this._getNode(this.currentNode);
		if (node && node.options?.length) {
			const optionsText = node.options.map((opt, i) => `${i+1}. ${opt.text}`).join('\n');
			desc += `\n\n${optionsText}`;
		}
		return desc;
	}

	_formatOptions(options) {
		return options.map((opt, i) => `${i+1}. ${opt.text}`).join('\n');
	}
}

// ===============================
//	SessionManager Class
// ===============================
class SessionManager {
	static sessions = new Map();

	constructor(userId) {
		this.userId = userId;
		this.session = SessionManager.sessions.get(userId) || null;
	}

	static forUser(userId) {
		return new SessionManager(userId);
	}

	static getSession(userId) {
		return SessionManager.sessions.get(userId) || null;
	}

	static setSession(userId, session) {
		SessionManager.sessions.set(userId, session);
	}

	async save() {
		try {
			if (!this.session) {
				return { success: false, message: `Session untuk user ${this.userId} tidak ditemukan.` };
			}

			const saveData = {
				userId: this.userId,
				timestamp: Date.now(),
				date: new Date().toISOString(),
				gameName: this.session.gameName,
				currentNode: this.session.currentNode,
				gameOver: this.session.gameOver,
				result: this.session.result,
				player: JSON.parse(JSON.stringify(this.session.player)),
				timeLeft: this.session.timeLeft,
				maxTime: this.session.maxTime
			};
			
			delete saveData.player.rules

			await db.save(this.userId, saveData);
			return { success: true, userId: this.userId, message: `✅ Game tersimpan untuk user ${this.userId}` };
		} catch (error) {
			// console.error('Save error:', error);
			return { success: false, message: `Gagal menyimpan game: ${error.message}` };
		}
	}

	async load() {
		try {
			const saveData = await db.get(this.userId);
			if (!saveData) return { success: false, message: `Data save untuk user '${this.userId}' tidak ditemukan.` };
			
			// Rehydrate session object (tanpa require, karena RulesManager dan Player sudah ada di scope)
			const rules = RulesManager.loadRules(saveData.gameName);
			const session = new Session(saveData.gameName, this.userId, rules);
			
			saveData.player.rules = rules
			
			Object.assign(session, {
				currentNode: saveData.currentNode,
				gameOver: saveData.gameOver,
				result: saveData.result,
				player: saveData.player,
				timeLeft: saveData.timeLeft,
				maxTime: saveData.maxTime
			});
			
			// Rebuild player object agar method2nya tersedia (karena player disimpan sebagai plain object)
			// Kita perlu mengembalikan prototype Player
			Object.setPrototypeOf(session.player, Player.prototype);
			
			SessionManager.setSession(this.userId, session);
			this.session = session;

			return { success: true, message: `Game dimuat! Disimpan: ${saveData.date}`, data: saveData };
		} catch (error) {
			return { success: false, message: `Gagal memuat game: ${error.message}` };
		}
	}

	async delete() {
		try {
			await db.remove(this.userId);
			SessionManager.sessions.delete(this.userId);
			return { success: true, message: `🗑️ Data user '${this.userId}' berhasil dihapus.` };
		} catch (error) {
			return { success: false, message: `Gagal menghapus data: ${error.message}` };
		}
	}

	static async listUsers(gameName) {
		try {
			// Menggunakan db.getAll() yang sudah ditambahkan
			const allSaves = await db.getAll();
			if (!Array.isArray(allSaves)) {
				return { success: false, users: [], message: 'db.getAll() tidak mengembalikan array' };
			}
			const gameSaves = allSaves.filter(save => save.gameName === gameName);
			return {
				success: true,
				users: gameSaves.map(save => ({
					userId: save.userId,
					date: save.date,
					node: save.currentNode,
					coin: save.player?.coin || 0,
					health: save.player?.kesehatan || 0
				}))
			};
		} catch (error) {
			return { success: false, users: [], message: `Gagal mengambil daftar user: ${error.message}` };
		}
	}

	async autoSave() {
		const result = await this.save();
		// if (result.success) console.log(`[Auto-save] User ${this.userId} tersimpan di ${new Date().toLocaleTimeString()}`);
		return result;
	}
}

// Ekspor yang diperlukan
export default Session;
export { Player, Session, SessionManager, RulesManager };