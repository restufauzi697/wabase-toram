import fetchJSON from '../utils/fetchJSON.js'
import logger from '../utils/logger.js'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import fs from 'fs'
 
 const __dirname = dirname(fileURLToPath(import.meta.url))
const API = 'https://quranenc.com/api/v1'

var language = global.setting.lang || 'id'
var localizaion = global.setting.localization || 'id'
var translation_key = global.setting.translation_key || 'indonesian_sabiq'
'۞'
function translate(lang) {
	if (translate.lang.includes(lang)) {
		language = lang
	} else
		translation_key = translate.available.find(({key})=>key==lang)?.key || translation_key
	const {title, description} = translate.available.find(({key})=>key==translation_key)
	return `${title}\n${description}`
}

translate.available = [{"key":"indonesian_sabiq","direction":"ltr","language_iso_code":"id","version":"1.1.3","last_update":1748871584,"title":"Terjemahan Berbahasa Indonesia - PT. Sabiq","description":"Diterbitkan oleh PT. Sabiq. Dikembangkan di bawah pengawasan Pusat Terjemah Ruww\u0101d. Teks terjemahan asli masih bisa ditampilkan untuk diberi masukan, evaluasi, dan pengembangan berkelanjutan.","file":"indonesian_sabiq","database_url":"https:\/\/quranenc.com\/downloads\/sqlite\/indonesian_sabiq.zip","database_uncompressed_url":"https:\/\/quranenc.com\/downloads\/sqlite\/indonesian_sabiq.sqlite","pdf_url":null,"pdf_pure_url":null,"pdf_mobile_url":null,"epub_url":null},{"key":"indonesian_affairs","direction":"ltr","language_iso_code":"id","version":"1.0.1","last_update":1750665512,"title":"Terjemahan Berbahasa Indonesia - Kementerian Agama","description":"Diterbitkan oleh Kementerian Agama Republik Indonesia. Dikembangkan di bawah pengawasan Pusat Terjemah Ruww\u0101d. Teks terjemahan asli masih bisa ditampilkan untuk diberi masukan, evaluasi, dan pengembangan berkelanjutan.","file":"indonesian_affairs","database_url":"https:\/\/quranenc.com\/downloads\/sqlite\/indonesian_affairs.zip","database_uncompressed_url":"https:\/\/quranenc.com\/downloads\/sqlite\/indonesian_affairs.sqlite","pdf_url":null,"pdf_pure_url":null,"pdf_mobile_url":null,"epub_url":null},{"key":"indonesian_complex","direction":"ltr","language_iso_code":"id","version":"1.0.1","last_update":1750935542,"title":"Terjemahan Berbahasa Indonesia - Kompleks King Fahd","description":"Diterbitkan oleh Kementerian Agama Republik Indonesia. Dikembangkan di bawah pengawasan Pusat Terjemah Ruww\u0101d. Teks terjemahan asli masih bisa ditampilkan untuk diberi masukan, evaluasi, dan pengembangan berkelanjutan.","file":"indonesian_complex","database_url":"https:\/\/quranenc.com\/downloads\/sqlite\/indonesian_complex.zip","database_uncompressed_url":"https:\/\/quranenc.com\/downloads\/sqlite\/indonesian_complex.sqlite","pdf_url":null,"pdf_pure_url":null,"pdf_mobile_url":null,"epub_url":null}];
translate.lang = []

async function fetch_translations(id) {
	try {
		const r = await fetchJSON(API+`/translations/list/${language}?localization=${localizaion}`)
		translate.available = r.translations || translate.available
	} catch (e) {
		logger.warn(e)
	}
	return translation_key = translate.available [0]?.key
}

const reg_surah = /(\d+). ([^(]+?) \(([^)]+)\)/
const surah = fs.readFileSync(join(__dirname, 'surah.txt'), 'utf-8')
const no_surah = {}
const list_surah = []

surah.split('\n')
	 . forEach(a=> {
		if (!reg_surah.test(a))
			return
		no_surah[RegExp.$2.toLowerCase()] = no_surah[RegExp.$1] = RegExp.$1
		list_surah[RegExp.$1] = RegExp.$2
	})

!async function() {
	try {
		const r = await fetchJSON(API+'/translations/languages')
		translate.lang = r.languages
		const a = await fetchJSON(API+'/translation/aya/indonesian_sabiq/1/1')
		bismilah.__arr = '*'+a.result.arabic_text+'*\n\n'
	} catch (e) {logger.error(e)}
}()

function bismilah(sura, aya) {
	if (sura > 1 && aya < 1)
		return bismilah.__arr
	return ''
}

function num2arabic(num) {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, d => arabicNumbers[d]);
}

const text_surah = ({aya,arabic_text,translation='',footnotes=''})=>`*${arabic_text}﴿${num2arabic(aya)}﴾*\n_${translation}_\n${footnotes}`

async function Quran (query, ops) {
	if (query == 'list')
		return surah
	try {
		query = Math.max(no_surah[query]|0, 1)
		const sura = await fetchJSON(API+`/translation/sura/${translation_key}/${query}`)
		const max_ayat = 10
		const max_page = Math.ceil(sura.result.length / max_ayat)
		if (ops && typeof ops == 'object') {
			ops = Math.max(ops.page|0, 1) - 1
			ops = ops >= max_page? 0: ops
			const aya_begin = max_ayat * ops
			const aya_ends = Math.min((max_ayat * ops) + max_ayat, sura.result.length)
			return `${list_surah[query]} ayat ${aya_begin+1}-${aya_ends} page ${ops+1}\n\n`
				 + bismilah(query, aya_begin)
				 + sura.result.slice(aya_begin, aya_ends)
				 . map(text_surah)
				 . join('\n')
				+ `\npage ${ops+1} from ${max_page}.`
		}
		ops = Math.max(ops|0, 1) - 1
		ops = ops >= sura.result.length? 0: ops
		return `${list_surah[query]} ayat ${ops+1}\n\n`+bismilah(query, ops)+text_surah(sura.result[ops]) 
		
	} catch (e) {
		logger.warn(e)
		return 'terjadi kesalahan'
	}
	
}

export default {Quran, translate}
export {Quran, translate}