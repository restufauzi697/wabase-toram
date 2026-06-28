export const command = {
	command: 'stab',
	tag: 'Toram Online',
	description: 'Gimana hitung stability Main dan Sub weapon?.',
	get help() {
		return `Usage: \`.stab <main> <sub> <str> <agi> [dex] [bonus]\`

main/sub = base stab weapon %
str/agi/dex = stat char
bonus = stab% dari equip/avatar/xtall

Contoh: 
- .stab 70 70 510 262
- .stab 70 80 250 255 1 15`;
	},
	handle: async (bot, m) => {
		if (!m.arguments?.length)
			return void await m.reply(command.description +'\n'+ command.help)
		
		let [main=1, sub=0, str=1, agi=1, dex=1, bonus=0] = m.text.split(/\s+/).map(a=>parseInt(a)).filter(a=>!isNaN(a))
		str = Math.max(1, str)
		agi = Math.max(1, agi)
		dex = Math.max(1, dex)
		
		const stab = hitungStabDW(main, sub, str, agi, dex, bonus)
		
		await m.reply([
			'*Stability*',
			'',
			`Base Stability Main: ${main}`,
			`Base Stability Sub: ${sub}`,
			`STR: ${str} AGI: ${agi} DEX: ${dex}`,
			`Bonus stab: ${bonus}`,
			'',
			'*Hasil*',
			`Main Wep: ${stab.main}`,
			`Sub Wep: ${stab.sub}`
		].join`\n`)
	}
}

/**
 * Hitung stability Dual Sword Toram Online
 * @param {number} stabMainwep - Base stability main weapon, contoh 80 = 80%
 * @param {number} stabSub - Base stability sub weapon, contoh 90 = 90%
 * @param {number} str - Total STR char
 * @param {number} agi - Total AGI char  
 * @param {number} dex - Total DEX char
 * @param {number} bonusStabEquip - Bonus stability % dari equip/avatar/xtal, contoh 20 = 20%
 * @returns {{main: number, sub: number}} Object stability main & sub, udah di-cap 100%
 */
function hitungStabDW(stabMainwep, stabSubwep, str, agi, dex, bonusStabEquip = 0) {
    // Mainhand: Base + (STR*1 + DEX*3)/40, cap 100
    let stabMain = stabMainwep + (str * 1 + dex * 3) / 40 + bonusStabEquip;
    stabMain = Math.min(stabMain, 100);

    // Subhand: stabSub/2 + STR*0.06 + AGI*0.04 + bonus, cap 100
    // Catatan: bonusStabEquip masuk ke subhand juga kalau dari avatar/xtal/equip
    let stabSub = stabSubwep / 2 + str * 0.06 + agi * 0.04 + bonusStabEquip;
    stabSub = Math.min(stabSub, 100);

    // Bulatkan 2 desimal biar rapih
    return {
        main: Math.floor(stabMain),
        sub: Math.floor(stabSub)
    };
}