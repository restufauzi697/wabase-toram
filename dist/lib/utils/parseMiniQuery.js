export default function parseMiniQuery(input) {
	const regex = {
		S_break_part: /(-?)([\w_]+):|\b(stats?)\b|\n/i, // part break
		O_stat: /^(-?[\w\s]+)((([><!~]?=|[=><])\s*(-?\d+\w*))?%?,?)/, // stat list dan operator dengan value
	}, result = { name: '', is: {}, stats: [], not: {} }
	var mode = 'name', option, turn = 0
	const extract_value = (val) => {
		if (mode == 'name')
			result.name = val
		if (mode == 'nkv')
			result.not[option] = val
		if (mode == 'kv')
			result.is[option] = val
		//console.log('extract:'+JSON.stringify(val))
	}
	
	input = input.trim()
	
	while (input) {
		if (mode == 'name'||mode == 'kv'|mode == 'nkv') {
			const token_break = regex.S_break_part.exec(input)
			if(!token_break) {
				//console.log('drop:'+JSON.stringify(input))
				extract_value(input)
				break
			}

			const [enter, not, k_option, stats_break] = token_break
			const idx = token_break.index
			const xtract_str = input.slice(0,idx).trim()
			
			input = input.slice(idx + enter.length).trim()
			const is_token_stat = regex.O_stat.exec(input)?.[3]
			
			//console.log('masuk:', mode, ' | ', input)
			
			if (xtract_str) extract_value(xtract_str)
			if (stats_break) mode = 'stat'
			if (k_option) mode = 'kv', option = k_option
			if (not) mode = 'nkv'
			if (enter == '\n' && is_token_stat) mode = 'stat'
			//console.log(idx, mode,option, '\n[===\n'+JSON.stringify(enter)+'\n===]\n`'+input+'`\n',JSON.stringify(result,null,1))
			//console.log(mode, token_break)
			//console.log('akhir:', input)
		} else if (mode == 'stat') {
			const token_stat = regex.O_stat.exec(input)
			
			if(!token_stat) break
			
			const [_, key, p, v, operator, val] = token_stat
			const idx = token_stat.index
			
			result.stats.push({ key: key.trim().replace(/stats?|-/,'').trim(), operator: v ? operator : key.includes('-') ? '<=' : null, value: v ? val.replace('%','') : key.includes('-') ? -1 : null, percent: p.includes('%')})
			input = input.slice(idx + _.length).trim()
			
			const token_break = regex.S_break_part.exec(input)
			if (token_break?.index == 0) {
				//console.log('go back to break part\n',token_break,'\n'+input)
				mode = 'kv'
			}
		} else break
		//console.log(turn++, '='.repeat(20)+'>')
	}
	return result
}

/*///
{
const queryString = `Sea Fog Compass (kabut gelap)
type: Ring
-extra_caption: nonbarter
   -ailment resistance <= -50%
hp = 23m
cspd=1000 ampr%, -pp%, ailment resist, guard break%
-extra_captions: barter
-obtain: Box
stats aspd >= -200`
const query = parseMiniQuery(queryString)

console.log(queryString)
console.log(query)
}
/*//*///
{
const queryString = `Sea Fog Compass (kabut gelap) type: Ring -extra_caption: nonbarter stat   -ailment resistance <= -50% hp = 23m cspd=1000 ampr%, -pp%, ailment resist, guard break% -extra_captions: barter -obtain: Box stats aspd >= -200` // sisa last line nya, masih bug
const query = parseMiniQuery(queryString)

console.log(queryString)
console.log(query)
}
/*//*///

{
const queryString = `Sea Fog Compass (kabut gelap)`
const query = parseMiniQuery(queryString)

console.log(queryString)
console.log(query)
}
/*//*///
{
const queryString = `type: Ring -extra_caption: nonbarter stat   -ailment resistance <= -50% hp = 23m cspd=1000 ampr%, -pp%, ailment resist, guard break% -extra_captions: barter -obtain: Box stats aspd >= -200` // sisa last line nya, masih bug
const query = parseMiniQuery(queryString)

console.log(queryString)
console.log(query)
}
/*//*///
{
const queryString = `stat   -ailment resistance <= -50% hp = 23m cspd=1000 ampr%, -pp%, ailment resist, guard break% -extra_captions: barter -obtain: Box stats aspd >= -200` // sisa last line nya, masih bug
const query = parseMiniQuery(queryString)

console.log(queryString)
console.log(query)
}
//*/