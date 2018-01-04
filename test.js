// const { test } = require('ava')
// const request = require('request-promise')
// const huya_danmu = require('./index')

// let roomids = []
// let wrong_roomid = '110001001'

// test.before(async () => {
//     let opt = {
//         url: 'http://www.huya.com/l?areafib=1',
//         timeout: 5000
//     }
//     let body = await request(opt)
//     let roomid_array = body.match(/"privateHost":"[0-9a-zA-Z]*"/g)
//     roomid_array.forEach(item => {
//         roomids.push(item.substring(15, item.length - 1))
//     })
// })

// test('expose a constructor', t => {
//     t.is(typeof huya_danmu, 'function')
// })

// test('instance class', t => {
//     const client = new huya_danmu(roomids[0])
//     t.is(client._roomid, roomids[0]);
// })

// for (let i = 0; i < 10; i++) {
//     test('get chat info', async t => {
//         const client = new huya_danmu(roomids[i])
//         let chat_info = await client._get_chat_info()
//         t.truthy(chat_info)
//         t.is(typeof chat_info.subsid, 'string')
//         t.is(typeof chat_info.topsid, 'string')
//         t.is(typeof chat_info.yyuid, 'string')
//     })
// }

// test('get a error chat info', async t => {
//     const client = new huya_danmu(wrong_roomid)
//     let chat_info = await client._get_chat_info()
//     t.falsy(chat_info)
// })

// test.cb('start success', t => {
//     const client = new huya_danmu(roomids[0])
//     client.start()
//     client.on('connect', () => {
//         t.is(typeof client, 'object')
//         t.true(client._starting)
//         t.is(typeof client._info, 'object')
//         t.is(typeof client._main_user_id, 'object')
//         t.is(typeof client._client, 'object')
//         t.is(typeof client._heartbeat_timer, 'object')
//         t.is(typeof client._fresh_gift_list_timer, 'object')
//         client.stop()
//         t.end()
//     })
// })

// test('start fail 1', t => {
//     const client = new huya_danmu(roomids[0])
//     client._starting = true
//     client.start()
//     t.falsy(client._client)
// })

// test.cb('start fail 2', t => {
//     const client = new huya_danmu(wrong_roomid)
//     client.start()
//     client.on('error', err => {
//         t.is(err.message, 'Fail to get info')
//         client.stop()
//         t.end()
//     })
// })

// test.cb('_stop', t => {
//     const client = new huya_danmu(roomids[2])
//     client.start()
//     client.on('connect', () => {
//         client._stop()
//     })
//     client.on('close', () => {
//         t.false(client._starting)
//         client.stop()
//         t.end()
//     })
// })

// test.cb('heart beat', t => {
//     const client = new huya_danmu(roomids[1])
//     let time
//     client.start()
//     client.on('connect', () => {
//         time = new Date().getTime()
//         client._heartbeat()
//         client.stop()
//         t.pass()
//         t.end()
//     })
// })

// test.cb('send msg error', t => {
//     const client = new huya_danmu(roomids[0])
//     client.start()
//     client.on('connect', () => {
//         client._send_wup('123')
//     })
//     client.on('error', err => {
//         t.is(err.message, `Cannot read property 'writeTo' of undefined`)
//         client.stop()
//         t.end()
//     })
// })

// test.cb('get online msg', t => {
//     const client = new huya_danmu(roomids[3])
//     client.start()
//     client.on('message', msg => {
//         if (msg.type === 'online') {
//             t.is(typeof msg.time, 'number')
//             t.is(typeof msg.count, 'number')
//             t.is(typeof msg.raw, 'object')
//             client.stop()
//             t.end()
//         }
//     })
// })

// test.cb('get chat msg', t => {
//     const client = new huya_danmu(roomids[0])
//     client.start()
//     client.on('message', msg => {
//         if (msg.type === 'chat') {
//             t.is(typeof msg.time, 'number')
//             t.is(typeof msg.from.name, 'string')
//             t.is(typeof msg.from.name, 'string')
//             t.is(typeof msg.content, 'string')
//             t.is(typeof msg.raw, 'object')
//             client.stop()
//             t.end()
//         }
//     })
// })

// test.cb('get gift msg', t => {
//     const client = new huya_danmu(roomids[0])
//     client.start()
//     client.on('message', msg => {
//         if (msg.type === 'gift') {
//             t.is(typeof msg.time, 'number')
//             t.is(typeof msg.name, 'string')
//             t.is(typeof msg.from.name, 'string')
//             t.is(typeof msg.from.name, 'string')
//             t.is(typeof msg.count, 'number')
//             t.is(typeof msg.price, 'number')
//             t.is(typeof msg.id, 'string')
//             t.is(typeof msg.raw, 'object')
//             client.stop()
//             t.end()
//         }
//     })
// })

// test.cb('get gift with no gift_info msg', t => {
//     const client = new huya_danmu(roomids[0])
//     client.start()
//     client.on('connect', () => {
//         setTimeout(() => {
//             client._gift_info = {}
//         }, 500);
//     })
//     client.on('message', msg => {
//         if (msg.type === 'gift' && msg.name === '未知礼物') {
//             t.is(msg.price, 0)
//             client.stop()
//             t.end()
//         }
//     })
// })

// test.cb('get gift msg dont emit', t => {
//     const client = new huya_danmu(roomids[0])
//     client.start()
//     client.on('connect', () => {
//         client._info.yyuid += '666'
//         setTimeout(() => {
//             t.pass()
//             t.end()
//         }, 3000);
//     })
//     client.on('message', msg => {
//         if (msg.type === 'gift') {
//             t.fail()
//         }
//     })
// })

// test.cb('error on mes', t => {
//     const client = new huya_danmu(roomids[0])
//     client.start()
//     client.on('connect', () => {
//         client._on_mes(123)
//     })
//     client.on('error', err => {
//         t.is(err.message, 'Argument must be a Buffer')
//         client.stop()
//         t.end()
//     })
// })

// test.cb('catch on ws error', t => {
//     const client = new huya_danmu(roomids[5])
//     client._ws_url = 'ws://ws.api.huya.com:1234'
//     client.start()
//     client.on('error', err => {
//         t.is(err.errno, 'ECONNREFUSED')
//         client.stop()
//         t.end()
//     })
// })


const huya_danmu = require('./index')


const client = new huya_danmu('chinababy', {
    ip: '193.93.194.134',
    port: 1085
})

client.on('message', msg => {
    console.log(msg);
})

client.start()
