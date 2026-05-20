import { isLidUser, delay, jidNormalizedUser } from 'baileys';
import logger from '../../utils/logger.js'

const ranNum = (a,b)=>Math.floor(a + Math.random() * (b-a))

export const command = {
	index: -2,
	command: 'add',
	onlyGroup: true,
	tag: '00Administratif',
	description: 'Add member ke group.',
    help: 'usage: `.add <phoneNumber> [phoneNumber ...]`\npastikan disertai dengan kode negara.\ncontoh: .add 628901234567 +12234567890',
	handle: async (bot, m) => {
		try{
			//# Data anggota
			const { participants, restrict, linkedParent } = await bot.groupMetadata(m.chat)
			
			if (restrict)
				logger.warn(m.chat+' [ restrict mode ]')
			
			//# Validasi admin
			const me = jidNormalizedUser(bot.user.id)
			const isAdmin = participants.filter(a => (a.id == m.sender || a.phoneNumber == me) && a.admin)
			
			if (!(isAdmin.length > 1))
				return await m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
			
			const kodenegara = 628 // default code negara
			const p = participants.map(a => jidNormalizedUser(a.phoneNumber))
			//# Target add member
			
			const jid = Array.from(new Set(
					m.text.split(/\s|,/)
					 . map(a=>a.replace(/\D/g,'').replace(/^08/, kodenegara) + '@s.whatsapp.net')
					 . filter(target=> target && !p.includes(target))
				 ))
			
			const target = await bot.onWhatsApp(...jid)
			
			if (!target.length)
				return await m.reply("nomot telp tidak valid")
			
			await m.reply({ react: { text: '🏷️', key: m.key } }, false)
			for(const {exists, jid} of target) {
				// if (linkedParent)
					// await bot.groupParticipantsUpdate(linkedParent, [jid], "add")
				const res = await bot.groupParticipantsUpdate(m.chat, [jid], "add")
				for (let x of res) {
					if (x.status != '200')
					if (x.status == '403')
						await m.reply({ text: `Gagal menambahkan @${x.jid.split('@')[0]}, kirim undangan...`, mentions: [x.jid] })
					else if (x.status == '408')
						await m.reply({ text: `Tidak bisa menambahkan @${x.jid.split('@')[0]}, karena dia baru saja keluar, coba lagi nanti...`, mentions: [x.jid] })
					else if (x.status == '409')
						await m.reply({ text: `@${x.jid.split('@')[0]} sudah berada dalam grup.`, mentions: [x.jid] })
					else 
						await m.reply({ text: `Gagal menambahkan @${x.jid.split('@')[0]}`, mentions: [x.jid] }),
						logger.warn(x, 'add participant')
				}
				await delay(ranNum(2000,5000))
			}
		} catch(e) {
			logger.error(e, 'Add menber, Failed')
			m.reply(`Terjadi kesalahan, tidak bisa menambahkan member group.`);
		}
		await m.reply({ react: { text: '️', key: m.key } }, false)
	}
}

/*
function normalizeNumber(rawNumber, defaultCountryCode = '62') {
    let digits = rawNumber.replace(/\D/g, '');
    if (digits.length === 0) throw new Error('Nomor tidak valid');
    if (digits.startsWith('0')) {
        digits = defaultCountryCode + digits.substring(1);
    }
    return `${digits}@s.whatsapp.net`;
}

async function getGroupInviteLink(conn, groupJid) {
    try {
        const inviteCode = await conn.groupInviteCode(groupJid);
        return `https://chat.whatsapp.com/${inviteCode}`;
    } catch (err) {
        console.error('Gagal membuat invite link:', err);
        throw new Error('Tidak dapat membuat tautan undangan grup.');
    }
}

async function sendInviteToUser(conn, userJid, groupJid, groupSubject) {
    try {
        const inviteLink = await getGroupInviteLink(conn, groupJid);
        const message = `🔓 *UNDANGAN GRUP*\n\nAnda tidak dapat ditambahkan langsung ke grup *${groupSubject}* karena pengaturan privasi.\nSilakan klik tautan berikut untuk bergabung:\n${inviteLink}\n\nTautan ini berlaku selamanya (atau sampai admin mereset).`;
        await conn.sendMessage(userJid, { text: message });
        return true;
    } catch (err) {
        console.error(`Gagal mengirim undangan ke ${userJid}:`, err);
        return false;
    }
}

async function handle(conn, m) {
    const remoteJid = m.key.remoteJid;
    const messageText = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    
    if (!remoteJid.endsWith('@g.us')) {
        await conn.sendMessage(remoteJid, { text: '❌ Perintah ini hanya bisa digunakan di dalam grup.' });
        return;
    }
    
    if (!messageText.startsWith('.add')) return;
    
    const args = messageText.slice(4).trim().split(/\s+/);
    if (args.length === 0) {
        await conn.sendMessage(remoteJid, { text: '⚠️ Gunakan: .add +122-333-444 089512345678 ...' });
        return;
    }
    
    let groupMetadata;
    try {
        groupMetadata = await conn.groupMetadata(remoteJid);
    } catch (err) {
        await conn.sendMessage(remoteJid, { text: '❌ Gagal mengambil informasi grup.' });
        return;
    }
    
    const senderId = m.key.participant || m.key.remoteJid;
    const botId = jidNormalizedUser(conn.user.id);
    
    const isSenderAdmin = groupMetadata.participants.some(p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin'));
    const isBotAdmin = groupMetadata.participants.some(p => p.phoneNumber === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
    
    if (!isSenderAdmin) {
        await conn.sendMessage(remoteJid, { text: '⛔ Hanya admin grup yang bisa menambahkan anggota.' });
        return;
    }
    
    if (!isBotAdmin) {
        await conn.sendMessage(remoteJid, { text: '🤖 Bot bukan admin grup, tidak dapat menambahkan anggota.' });
        return;
    }
    
    // Parsing nomor
    const participants = [];
    const invalidNumbers = [];
    for (const raw of args) {
        try {
            const jid = normalizeNumber(raw);
            participants.push(jid);
        } catch (err) {
            invalidNumbers.push(`${raw} → ${err.message}`);
        }
    }
    
    if (participants.length === 0) {
        await conn.sendMessage(remoteJid, { text: `❌ Tidak ada nomor yang valid:\n${invalidNumbers.join('\n')}` });
        return;
    }
    
    // Proses satu per satu
    let successCount = 0;
    let alreadyInGroup = [];     // array of jid
    let timeoutList = [];        // array of jid
    let needInviteList = [];     // array of { jid, phoneNumber }
    let otherErrors = [];        // array of { jid, status }
    
    const groupSubject = groupMetadata.subject;
    
    for (const jid of participants) {
        try {
            // Tambah satu user
            const result = await conn.groupParticipantsUpdate(remoteJid, [jid], 'add');
            // result adalah array dengan satu objek (karena hanya satu peserta)
            const res = result[0];
            const status = res.status;
            const phoneNumber = jid.split('@')[0];
            
            if (status === '200') {
                successCount++;
            } else if (status === '408') {
                timeoutList.push(jid);
            } else if (status === '409') {
                alreadyInGroup.push(jid);
            } else if (status === '403') {
                needInviteList.push({ jid, phoneNumber });
            } else {
                otherErrors.push({ jid, status });
            }
        } catch (err) {
            // Jika error total (misal network), catat sebagai error lain
            console.error(`Error saat menambah ${jid}:`, err);
            otherErrors.push({ jid, status: err.message || 'unknown' });
        }
        
        // Jeda singkat antar request untuk menghindari rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Kirim undangan untuk user dengan status 403
    const inviteResults = [];
    for (const user of needInviteList) {
        const sent = await sendInviteToUser(conn, user.jid, remoteJid, groupSubject);
        inviteResults.push(`${user.phoneNumber} (${sent ? 'berhasil dikirim' : 'gagal dikirim'})`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Kumpulkan semua JID yang akan di-mention
    const mentions = [
        ...alreadyInGroup,
        ...timeoutList,
        ...needInviteList.map(u => u.jid),
        ...otherErrors.map(e => e.jid)
    ];
    
    // Buat pesan laporan dengan format yang support mentions
    let report = `📊 *Laporan Penambahan Anggota*\n\n`;
    if (successCount > 0) report += `✅ Berhasil ditambahkan: ${successCount} orang\n`;
    if (alreadyInGroup.length > 0) {
        report += `⚠️ Sudah dalam grup: ${alreadyInGroup.map(j => `@${j.split('@')[0]}`).join(', ')}\n`;
    }
    if (timeoutList.length > 0) {
        report += `⏱️ Timeout (408): ${timeoutList.map(j => `@${j.split('@')[0]}`).join(', ')} - coba lagi nanti\n`;
    }
    if (needInviteList.length > 0) {
        report += `🔐 Perlu undangan (403):\n`;
        report += `   ${inviteResults.join('\n   ')}\n`;
        report += `   *Undangan telah dikirim secara pribadi ke pengguna.*\n`;
    }
    if (otherErrors.length > 0) {
        report += `❌ Error lain: ${otherErrors.map(e => `@${e.jid.split('@')[0]} (${e.status})`).join(', ')}\n`;
    }
    if (invalidNumbers.length > 0) report += `📛 Nomor tidak valid: ${invalidNumbers.join(', ')}\n`;
    
    // Kirim laporan dengan mentions
    await conn.sendMessage(remoteJid, { 
        text: report,
        mentions: mentions 
    });
}
*/