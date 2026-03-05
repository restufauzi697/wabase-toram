"use strict"
import logger from '../utils/logger.js'
import moment from "moment-timezone"
moment.locale("id")
import fs from 'fs/promises'
export {
	question,
	_x_q_one
}

async function _x_q_one(q) {
	if (!_x_q_one_d.has(q) && _x_q_one_c.has(q))
	return _x_q_one_d.add(q), _x_q_one_c.get(q)
	
	try {
		const filePath = 'assets/games/source/vquest.txt'
		const data = await fs.readFile(filePath, 'utf8')
		const lines = data.split('\n')
		
		q = q.toLowerCase()
		
		for (const line of lines) {
			let [k, r] = line.split(/\s*:\s*/)
			k = k.split(/\s*;\s*/).map(toLowerCase)
			if (k.includes(q))
				return shake(r.split(/\s*;\s*/))
		}
		
		return question(q)
	} catch (e) {
		logger.warn(e)
		return shake(quotes)
	}
}

async function question(q) {
	
	if(/quotes?/i.test(q))
		return quote()
	if(/fakta|info/i.test(q))
		return `Faktanya, ${shake(fakta)}`
	return await question(shake(['fakta','quotes']))
}

function quote() {
	return moment().tz(setting.timezone).hour() < 9
		 ? `Quotes pagi ini, _${shake(quotes.slice(...q_section[q_section[0]]))}_`
		 : `Quotes untuk kamu, _${shake(quotes.filter(String))}_`
}

function shake(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}

const toLowerCase = a => a.toLowerCase()

const fakta = ['Massa bumi mencapai 5.972.190.000.000.000.000.000.000 kg. Mesekipun sedemikian berat, Bumi memiliki kecepatan 107.281 km per jam untuk mengitari matahari. Cepat sekali, bukan?','Massa berat bumi didominasi debu-debu antariksa dan dapat berkurang akibat gas seperti hidrogen yang berkurang tiga kilogram setiap detiknya. Fakta unik ini menunjukkan bahwa bumi akan kehilangan 95 ribu ton massa setiap tahunnya','Pada 2018 populasi manusia diperkirakan mencapai 7,6 miliar orang. Meskipun bumi dipenuhi manusia, fakta unik mengungkapkan bahwa manusia tidak memengaruhi massa bumi. Hal ini dikarenakan manusia terbentuk dari atom dalam bentuk oksigen 65 persen, karbon 18,5 persen, dan hidrogen 9,5 persen.','Bumi dipenuhi oleh 70 persen air sehingga kerap wajar jika bumi disebut dengan nama planet air. Lautan bumi yang paling dalam adalah Palung Mariana dengan kedalaman 10.994 meter di bawah air. Fakta unik dibalik Palung Mariana adalah jika kamu meletakkan Gunung Everest di sana, puncak tertingginya bahkan masih berada di bawah permukaan laut sejauh 1,6 kilometer!','Bumi yang manusia tinggali hanya satu persen bagian dari keseluruhan planet bumi. Fakta unik ini menunjukkan bahwa masih banyak bagian bumi yang memiliki misteri kehidupan. Tertarik melakukan penjelajahan untuk menguak misteri sekaligus fakta unik di bagian bumi lainnya','Terdapat sebuah kota di Rusia yang jalanannya tertata rapi dengan sebuah istana yang didesain seperti catur yang megah. Pembuatan pemukiman tersebut didalangi oleh presiden yang terobsesi dengan catur bernama Kirsan Ilyumzhinov.','Apakah kamu tahu fakta unik mengenai mozzarella yang dibuat dari susu kerbau dan bukan susu sapi? Sekitar 500 tahun yang lalu di Campania, Italia, mozzarella dibuat pertama kali menggunakan susu kerbau. Fakta unik dibalik penggunaan susu kerbau ini karena kandungan protein susu kerbau 10-11% lebih banyak daripada susu sapi.','Bali memiliki fakta unik karena memliki banyak hari libur yang disumbangkan oleh sejumlah hari raya besar keagamaan. Hampir setiap hari besar keagamaan ini setiap orang akan mendapatkan libur. Beberapa hai libur diantaranya adalah hari raya galungan, kuningan, nyepi, pagerwesi, saraswati, dan sejumlah upacara besar lainnya seperti piodalan (pujawali).','Ibukota Jakarta memiliki banyak pesona juga fakta unik yang mungkin belum kamu ketahui. Sebelum diberi nama Jakarta, Ibukota indonesia ini telah memiliki beberapa kali perubahan nama. Nama Ibukota indonesia sesuai urutan perubahannya diantaranya adalah Sunda Kelapa, Jayakarta, Batavia, Betawi, Jacatra, Jayakarta, dan Jakarta.','Pada tahun 1952 jendela pesawat didesain dalam bentuk persegi namun penggunaannya dinilai cacat sehingga tidak  diterapkan kembali. Jendela yang bulat dirancang untuk menyiasati perbedaan tekanan udara dalam dan luar pesawat untuk menghindari kegagalan struktural yang dapat menyebabkan kecelakaan pesawat.','Makanan utama dari nyamuk jantan dan betina pada umumnya adalah nektar dan zat manis yang sebagian besar diperoleh dari tanaman. Namun nyamuk membutuhkan protein tambahan unuk bertelur yang bisa didapatkan dari manusia sedangkan nyamuk jantan tidak membutuhkan zat protein tambahan untuk bertelur.','Jembatan suramadu (surabaya-madura) adalah jembatan terpanjang di Asia Tenggara (5438 m).','Tertawa dan bahagia meningkatkan imun, terutama produksi sel-sel pembunuh alamiah yang membantu melindungi tubuh dari penyakit','Kecoa kentut setiap 15 menit dan terus mengeluarkan gas metana (kentut) selama 18 jam setelah kematian.','Mengoleskan jeruk nipis dapat mencerahkan bagian lutut / siku yang hitam.','Energi yang dihasilkan oleh angin ribut (topan) selama 10 menit lebih besar dibandingkan energi dari bom saat perang','Satu-satunya indera manusia yang tidak berfungsi saat tidur adalah indera penciuman.','Para astronot dilarang makan makanan berjenis kacang-kacangan sebelum pergi ke luar angkasa. Karena bisa menyebabkan mereka mudah kentut. Dan gas kentut sangat membahayakan bagi baju luar angkasa mereka.','Di AS saja, kucing membunuh miliaran hewan dalam kurun waktu setahun. Mereka bertanggung jawab atas kematian 1,4 - 73,7 miliar burung dan 6,9 - 20,7 miliar mamalia setiap tahun. Bukan hanya itu, sejauh ini mereka benar-benar memusnahkan total 33 spesies dari dunia.','Ikan hiu kehilangan gigi lebih dari 6000buah setiap tahun, dan gigi barunya tumbuh dalam waktu 24 jam.','Semut dapat mengangkat Beban 50 kali tubuhnya.','Mulut menghasilkan 1 liter ludah setiap hari.','Siput bisa tidur selama 3 tahun','Kecoak bisa hidup 9 hari tanpa kepala, dan akan mati karena kelaparan','Mata burung unta lebih besar dari otaknya',
'Kamu memiliki lebih dari 60 otot di wajah, yang membantu kamu untuk melakukan ekspresi wajah yang berbeda-beda.',

'Gula adalah bahan alami yang ditemukan dalam buah-buahan dan sayuran, namun gula yang kita konsumsi sehari-hari adalah gula yang telah diproses.',

'Mata manusia dapat melihat sekitar 10 juta warna yang berbeda-beda, namun tidak semua orang dapat melihat warna dengan cara yang sama.',

'Kucing adalah hewan yang sangat lincah dan dapat melompat hingga 5 kali tinggi badannya.',

'Kamu memiliki sekitar 100.000 rambut di kepala, namun jumlahnya dapat berbeda-beda pada setiap orang.',

'Bumi berputar dengan kecepatan 1.674 km/jam, namun kita tidak dapat merasakan pergerakannya karena kita berada di atas permukaan Bumi.',

'Kamu dapat hidup tanpa makanan selama sekitar 30 hari, namun kamu harus tetap minum air untuk menjaga hidrasi tubuh.',

'Gajah memiliki ingatan yang sangat baik dan dapat mengingat kejadian yang terjadi beberapa dekade yang lalu.',

'Kamu memiliki sekitar 70.000 pikiran dalam sehari, namun tidak semua pikiran tersebut dapat diingat.',
'Hujan dapat membantu mengurangi polusi udara dengan membersihkan partikel-partikel polutan dari atmosfer.',

'Kamu memiliki sekitar 100 miliar neuron di otak, yang membantu kamu untuk berpikir, belajar, dan mengingat.',

'Gula dapat mempengaruhi perilaku seseorang, seperti membuat mereka lebih agresif atau lebih bahagia.',

'Kamu dapat melihat bintang-bintang yang berjarak 4,2 tahun cahaya dari Bumi, yang berarti bahwa cahaya yang kamu lihat sekarang telah melakukan perjalanan selama 4,2 tahun.',

'Kucing memiliki telinga yang sangat sensitif dan dapat mendengar suara yang tidak dapat didengar oleh manusia.',

'Kamu memiliki sekitar 206 tulang di tubuh, namun jumlahnya dapat berbeda-beda pada setiap orang.',

'Bumi memiliki sekitar 1,3 miliar kilometer kubik air, yang sebagian besar berada di lautan.',

'Kamu dapat hidup tanpa tidur selama sekitar 11 hari, namun kamu akan mengalami gangguan mental dan fisik yang serius.',

'Gajah dapat mengenali diri sendiri di cermin, yang menunjukkan bahwa mereka memiliki kesadaran diri yang tinggi.',

'Kamu memiliki sekitar 5 juta reseptor penciuman di hidung, yang membantu kamu untuk mendeteksi bau-bauan yang berbeda-beda.']

const q_section = [
	"Quotes Motivasi untuk Memulai Hari",
	"Quotes tentang Cinta dan Persahabatan",
	"Quotes tentang Kehidupan dan Kebahagiaan",
	"Quotes tentang Kesuksesan dan Perjuangan",
	"Quotes tentang Keberanian dan Keteguhan",
	"Quotes tentang Waktu dan Kesempatan",
	"Quotes tentang Diri Sendiri dan Harga Diri",
	"Quotes tentang Harapan dan Impian",
	"Quotes tentang Kebaikan dan Keikhlasan",
	"Quotes tentang Perubahan dan Pertumbuhan"
]

//# ("",) adalah penanda section
const quotes = [
//# Quotes Motivasi untuk Memulai Hari
	"Hari baru, kesempatan baru. Jangan sia-siakan!",
	"Langkah kecil hari ini membawamu lebih dekat ke mimpi besar.",
	"Jangan takut gagal, takutlah pada tidak pernah mencoba.",
	"Senyummu adalah energi positif untuk dunia.",
	"Keberhasilan dimulai dari keberanian untuk bertindak.",
	"Jadilah versi terbaik dirimu setiap hari.",
	"Hidup adalah perjuangan, tapi kamu lebih kuat dari itu.",
	"Mimpi besar, kerja keras, dan doa tulus adalah kunci sukses.",
	"Jangan tunggu waktu yang sempurna, ciptakan waktu itu sekarang.",
	"Setiap tantangan adalah pelajaran untuk menjadi lebih baik.",
	"",
//# Quotes tentang Cinta dan Persahabatan
	"Cinta sejati adalah saling mendukung, bukan saling mengekang.",
	"Sahabat sejati selalu ada di saat suka dan duka.",
	"Cinta adalah ketika kebahagiaan orang lain lebih penting dari egomu.",
	"Persahabatan adalah harta yang tak ternilai harganya.",
	"Mencintai adalah memberi tanpa mengharapkan balasan.",
	"Sahabat adalah cermin yang jujur untuk hidupmu.",
	"Cinta bukan tentang memiliki, tapi tentang menghargai.",
	"Orang yang tepat akan membuatmu merasa cukup.",
	"Persahabatan sejati tak memandang jarak atau waktu.",
	"Cinta yang tulus tak pernah meminta kesempurnaan.",
	"",
//# Quotes tentang Kehidupan dan Kebahagiaan
	"Hidup adalah anugerah, syukuri setiap detiknya.",
	"Kebahagiaan bukan tujuan, tapi cara hidup.",
	"Jangan bandingkan hidupmu dengan orang lain, jalani ceritamu sendiri.",
	"Hal kecil yang kamu syukuri adalah kunci kebahagiaan besar.",
	"Hidup adalah pilihan, pilih untuk bahagia.",
	"Jangan biarkan masa lalu mencuri masa depanmu.",
	"Kebahagiaan sejati datang dari hati yang damai.",
	"Hidup adalah perjalanan, nikmati setiap langkahnya.",
	"Syukur mengubah apa yang kamu miliki menjadi cukup.",
	"Hidup adalah seni, lukis dengan warna-warna kebaikan.",
	"",
//# Quotes tentang Kesuksesan dan Perjuangan
	"Kesuksesan bukan akhir, tapi awal dari tantangan baru.",
	"Perjuangan hari ini adalah investasi untuk masa depan.",
	"Jangan menyerah, karena kamu lebih dekat dari yang kamu kira.",
	"Kesuksesan adalah hasil dari kerja keras dan ketekunan.",
	"Rintangan adalah ujian untuk membuktikan seberapa besar mimpimu.",
	"Keberhasilan tidak datang tiba-tiba, tapi dari langkah kecil.",
	"Jangan takut bermimpi besar, takutlah pada hidup tanpa tujuan.",
	"Kesuksesan adalah ketika kamu bangkit lebih sering daripada jatuh.",
	"Berjuanglah hari ini untuk tersenyum di masa depan.",
	"Ketekunan mengalahkan bakat yang tidak digunakan.",
	"",
//# Quotes tentang Keberanian dan Keteguhan
	"Keberanian bukan tidak takut, tapi bertindak meski takut.",
	"Jangan biarkan ketakutan menghentikan langkahmu.",
	"Keteguhan hati mengalahkan segala rintangan.",
	"Berani bermimpi adalah langkah pertama menuju kenyataan.",
	"Jangan takut berbeda, karena itu adalah kekuatanmu.",
	"Keberanian adalah kunci untuk membuka pintu kesuksesan.",
	"Hadapi ketakutanmu, dan kamu akan menemukan kekuatanmu.",
	"Jangan biarkan opini orang lain mengatur hidupmu.",
	"Keberanian kecil hari ini membawa perubahan besar besok.",
	"Tetap teguh, meski dunia mencoba menjatuhkanmu.",
	"",
//# Quotes tentang Waktu dan Kesempatan
	"Waktu adalah harta, gunakan dengan bijak.",
	"Jangan tunda hari ini, karena besok bukan milikmu.",
	"Kesempatan datang bagi mereka yang siap menerimanya.",
	"Waktu yang hilang tak pernah kembali, manfaatkan sekarang.",
	"Tiap detik adalah kesempatan untuk menjadi lebih baik.",
	"Jangan tunggu momen sempurna, buat momen itu sekarang.",
	"Waktu adalah guru terbaik, dengarkan pelajarannya.",
	"Kesempatan besar sering datang dalam wujud kecil.",
	"Manfaatkan waktu untuk hal-hal yang benar-benar penting.",
	"Hidup adalah waktu, jangan sia-siakan untuk penyesalan.",
	"",
//# Quotes tentang Diri Sendiri dan Harga Diri
	"Cintai dirimu sebelum mencintai orang lain.",
	"Kamu adalah karya seni, jangan biarkan orang lain mengubahmu.",
	"Harga dirimu adalah cerminan dari apa yang kamu percayai.",
	"Jadilah dirimu sendiri, karena itu adalah kekuatan terbesarmu.",
	"Jangan biarkan dunia mendikte siapa kamu seharusnya.",
	"Kamu cukup, meski dunia berkata sebaliknya.",
	"Hargai dirimu, karena kamu layak untuk bahagia.",
	"Jangan takut bersinar, dunia butuh cahayamu.",
	"Kamu adalah cerita yang layak untuk diceritakan.",
	"Cintai kekuranganmu, karena itu membuatmu unik.",
	"",
//# Quotes tentang Harapan dan Impian
	"Harapan adalah bintang yang menuntun di malam gelap.",
	"Jangan pernah kehilangan impian, karena itu adalah bahan bakar hidup.",
	"Impian besar dimulai dari langkah kecil.",
	"Harapan adalah kunci untuk tetap bergerak maju.",
	"Jangan biarkan impianmu hanya jadi angan-angan.",
	"Harapan adalah nyala yang tak pernah padam di hati.",
	"Impianmu adalah peta menuju masa depanmu.",
	"Tanpa harapan, hidup hanyalah bayangan.",
	"Impian adalah benih, kerja keras adalah airnya.",
	"Harapan membuatmu bangkit, meski dunia menjatuhkan.",
	"",
//# Quotes tentang Kebaikan dan Keikhlasan
	"Kebaikan kecil bisa mengubah dunia seseorang.",
	"Berbuat baiklah, meski tak ada yang melihat.",
	"Keikhlasan adalah kunci kebahagiaan sejati.",
	"Kebaikan adalah bahasa yang dimengerti semua orang.",
	"Berikan kebaikan, dan dunia akan membalasmu.",
	"Keikhlasan membuat setiap tindakan bermakna.",
	"Kebaikan adalah investasi yang tak pernah rugi.",
	"Hati yang ikhlas selalu menemukan kedamaian.",
	"Kebaikan adalah cermin dari jiwa yang mulia.",
	"Berbagi kebaikan adalah cara terbaik untuk hidup.",
	"",
//# Quotes tentang Perubahan dan Pertumbuhan
	"Perubahan adalah langkah menuju versi terbaik dirimu.",
	"Tumbuhlah dari setiap kesalahan yang kamu buat.",
	"Jangan takut berubah, takutlah pada stagnasi.",
	"Perubahan adalah kesempatan untuk menjadi lebih baik.",
	"Hidup adalah tentang belajar dan terus bertumbuh.",
	"Terima perubahan, karena itu adalah bagian dari hidup.",
	"Kesalahan adalah guru untuk pertumbuhanmu.",
	"Berubah adalah tanda bahwa kamu masih hidup.",
	"Pertumbuhan dimulai dari keberanian untuk melangkah.",
	"Jadilah pohon yang terus tumbuh, meski badai datang.",
].filter( (a,i,r) => {
	if(!a || i == r.length-1) {
		a = q_section
		a.a = a.shift()
		a[a.a] = [a.i|0, a.i=i+1]
		a.push(a.a)
	}
	return a
})

const _x_q_one_c = new Map(), _x_q_one_d = new Set()

_x_q_one_c.set('Apakah bola salju seru?', 'Sangat seru! Aku suka melempar bola salju ke teman-teman.')

_x_q_one_c.set('Gimana bikin bola salju?', 'Kamu harus mengumpulkan salju yang basah dan membentuknya menjadi bola.')

_x_q_one_c.set('Kalau hancur?', 'Jangan khawatir, kita bisa membuat yang baru!')

_x_q_one_c.set('Berapa banyak?', 'Sebanyak mungkin! Salju tidak akan habis.')

_x_q_one_c.set('Gimana kalau teman kita yang kena bola salju?', 'Kita harus tertawa dan meminta maaf!')

_x_q_one_c.set('Gak ada aturan ya?..', 'Tidak ada aturan, kita bisa bermain semaunya!')

_x_q_one_c.set('Gimana kalo mendadak habis bola salju?', 'Kita bisa mencari salju lain atau membuat benteng salju.')

_x_q_one_c.set('Apakah permainan lempar bola salju hanya untuk anak-anak?', 'Tidak, semua orang bisa bermain!')

_x_q_one_c.set('Kenapa lempar salju seru?', 'Karena kita bisa bermain dengan teman-teman dan menikmati salju.')

_x_q_one_c.set('Apa kamu mau bermain dengan ku?', 'Tentu saja! Aku siap!')

