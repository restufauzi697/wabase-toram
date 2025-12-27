import fs from 'fs'
import path from 'path'
import { Crystal, load as loadXtall } from './Crystal.js'
import logger from '../logger.js'

export default async function Xtall() {
	await loadXtall()
	
	try {
		const en = JSON.parse( fs.readFileSync(path.resolve(process.cwd(), 'assets/toram/items', 'Xtall-en.json'), 'utf-8'))
		let translated = 0
		Crystal.List.forEach( (xtall)=> {
			const { name, name1, name2 } = xtall
			translated += (en[name2] && xtall.name != en[name2]) |0
			xtall.name = en[name2] || name
			xtall.name1 = en[name2] || name1
		} )
	} catch (e) {
		logger.warn(e)
	}
	
	return Crystal
}
