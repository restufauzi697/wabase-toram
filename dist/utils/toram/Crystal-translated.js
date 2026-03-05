import fs from 'fs'
import path from 'path'
import { Crystal, load as loadXtall } from './Crystal.js'
import logger from '../logger.js'

export default async function Xtall() {
	await loadXtall()
	
	try {
		const en = JSON.parse( fs.readFileSync(path.resolve(process.cwd(), 'assets/toram/items', 'Xtall-en.json'), 'utf-8'))
		let translated = 0
		const property = (prop)=> {
			const { value1, value2, value3 } = prop
			prop.value3 = en[value1] || value3
		}
		Crystal.List.forEach( (xtall)=> {
			const { name, name1, name2, data } = xtall
			translated += (en[name2] && xtall.name != en[name2]) |0
			xtall.name = en[name2] || name
			xtall.name1 = en[name2] || name1
			for(let [key,val] of Object.entries(data)) {
				if (key == 'stats') continue
				val.forEach(property)
			}
		} )
	} catch (e) {
		logger.warn(e)
	}
	
	return Crystal
}
