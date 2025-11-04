import { spawn } from 'child_process'

function start() {
    const child = spawn(process.argv0, ['dist/bot.js', ...process.argv], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    })
    child
        .on('message', msg => {
            if (msg === 'restart') {
                child.kill()
                child.once('close', start)
            }
        })
        .on('exit', code => {
            if (code) start()
        })
        .on('error', console.log)
}

start()
