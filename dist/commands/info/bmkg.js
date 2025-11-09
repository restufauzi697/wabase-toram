import moment from "moment-timezone"; moment.locale("id");

export const command = {
	command: 'bmkg',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '_Informasi_',
	description: 'info gempa dan cuaca dari BMKG.',
	get help() {
		return 'usage: `.bmkg <info> [arg...]`\n'
			+'<info>:\n'
			//+'- ~cuaca <daerah>~\n'
			+'- gempa [terbaru|terkini|>N.0]\n'
			+'\ncontoh:\n'
			+'`.bmkg gempa >=5.0`'
	},
	handle: async (bot, m) => {
		const arg = m.arguments[0]?.split(' ') || ['gempa']
		const inf = arg[0]
		
		if (inf == 'gempa'){
			let a = arg[1]
			a = await gempa(
				 />={0,1}(\d.\d)/.test(a)
				 ? RegExp.$1 >= 5.0
					 ? 'gempaterkini'
					 : 'gempadirasakan'
				 : a == 'terkini'
				 ? 'gempaterkini'
				 : 'autogempa',
				 RegExp.$1
			)
			await m.reply(a)
		}
		
	},
}


async function gempa(info, mg) {
	const {error = '', Infogempa = {}} = await get_datagempa(name.includes(info)?info:'autogempa')
	
	if(error)
		return error;
	const {
		//Tanggal,  //: "13 Okt 2025",
		//Jam,      //: "05:08:58 WIB",
		DateTime,   //: "2025-10-12T22:08:58+00:00",
		//Coordinates,//: "-4.77,122.59",
		Lintang,    //: "4.77 LS",
		Bujur,      //: "122.59 BT",
		Magnitude,  //: "4.6",
		Kedalaman,  //: "5 km",
		Wilayah,    //: "Pusat gempa berada di darat 16 km timurlaut Muna Barat",
		Potensi,    //: "Gempa ini dirasakan untuk diteruskan pada masyarakat",
		Dirasakan,  //: "III - IV Muna Barat, III - IV Muna",
		Shakemap = formatMMI(DateTime) + '.mmi.jpg',   //: "20251013050858.mmi.jpg"
	} = Infogempa?.gempa?.sort
		?.((a,b) => a.Magnitude - b.Magnitude)
		 .find(a => mg ? a.Magnitude>= mg : true) || Infogempa?.gempa || {},
	txt_koordinat= {'LS':'Lintang Selatan','LU':'Lintang Utara', 'BT':'Bujur Timur','BB':'Bujur Barat'},
	[Tanggal, Jam] = formatDate(DateTime).split(' | ');
	
	if (! Magnitude) return tidak_ketemu()
	
	let
	imageUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${Shakemap}`
	try {
		const response = await fetch(imageUrl)
		if (!response.ok)
			imageUrl = './assets/toram/texture/rf_acme.jpg'
	} catch(err) {
		imageUrl = './assets/toram/texture/rf_acme.jpg'
	}
  return {
			image: { url: imageUrl },
			caption: `*📢 Informasi Gempa ${Magnitude >= 5.0? `Terkini (${Magnitude} SR)`:'Terbaru'}*
		
 _${Wilayah}_
 
🗓️ *Tanggal*: ${Tanggal}
⏰ *Waktu*: ${Jam}
${
	Potensi? `\n> 🌊${Potensi}\n`:''
}
📏 *Magnitudo*: ${Magnitude}
🔻 *Kedalaman*: ${Kedalaman}
📍 *Koordinat*: ${
	[Lintang,Bujur].map
	(
		a=>a.replace(
			/LS$|LU$|BT$|BB$/,
			a=>txt_koordinat[a]+` (${a})`
		)
	).join(',\n		')
}
${Dirasakan?'🏘 *Wilayah yang Merasakan*:' + Dirasakan.split(',').map(a=>'\n		• '+a.trim()).join('') : '' }


Semoga informasi ini bermanfaat!\n_BMKG_`
	}
}

const name = ['autogempa', 'gempaterkini', 'gempadirasakan']

async function get_datagempa(name) {
	try {
		const response = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/${name}.json`);
		if (!response.ok) {
			throw new Error(`Error! ${response.status}`);
		}
		const data = await response.json();
		return data;
	} catch (error) {
		return {
			error: `Gagal mengambil data gempa terkini: ${error.message}`
		}
	}
}

function formatDate(dateTime) {
	return moment(dateTime).tz("Asia/Jakarta").format("D MMMM YYYY | HH:mm:ss z")
}

function formatMMI(dateTime) {
	return moment(dateTime).tz("Asia/Jakarta").format("YYYYMMDDHHmmss")
}

const ntfound = [
	'maaf,/sepertinya/kok/kayanya'.split('/'),
	'data/sekarang/info'.split('/'),
	'tidak ditemukan./ngga ketemu../sudah hilang./...'.split('/'),
	]
function tidak_ketemu() {
	return ntfound.map(a=>a[Math.floor(Math.random()*a.length)]).join(' ')
}