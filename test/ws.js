const Websocket = require('ws')
let host = 'ws://127.0.0.1:17842'
host = 'ws://0.0.0.0:17832'
host = 'ws://43.153.178.133:17832'
console.log('start connect..' + host)
const ws = new Websocket(host)
ws.on('error', console.error)
ws.on('close', function close(evt) {
    console.log('close', evt)
})

ws.on('open', function open() {
    const action = 'l'
    console.log('action: %s', action)
    ws.send(JSON.stringify({ action: action }))
})

ws.on('message', function message(data) {
    console.log('received: %s', JSON.parse(data))
})