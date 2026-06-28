import { get, save, remove } from '../session/db.js';
import { ToramLevelSystem } from '../../lib/ToramLevelSystem.js';
import logger from '../logger.js';
import axios from "axios";

const STORAGE_KEY = 'toram_quest';

const DataPath = {
	Quest: 'https://docs.google.com/spreadsheets/d/1hh66cAWlDk2uJlAbv2ivdrRNQYuK4RPuWF4iB48T31g/pub?gid=1111992028&single=true&output=csv&range=A:I'
}

export default async function Quest(load) {
	let side = [], mq = []
	try {
		const data = await get(STORAGE_KEY)
		if (data?.mq && load !== true) return {mq: data.mq, side}
		const csvString = (await axios.get(DataPath.Quest))?.data || ''
		mq = ToramLevelSystem.parseQuestsFromCSV(csvString)
		await save(STORAGE_KEY, {mq, side})
	} catch(err) {
		logger.warn(err, 'get: quest')
	}
	return {mq, side}
}