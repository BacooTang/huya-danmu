# huya-danmu

huya-danmu 是Node.js版本虎牙直播弹幕监听模块。

简单易用，使用不到三十行代码，你就可以使用Node.js基于弹幕进一步开发。

## Installation

可以通过本命令安装 huya-danmu:

```bash
npm install huya-danmu --save
```

## Simple uses

通过如下代码，可以初步通过Node.js对弹幕进行处理。

```javascript
const huya_danmu = require('huya-danmu')
const roomid = 'kaerlol'
const client = new huya_danmu(roomid)

client.on('connect', () => {
    console.log(`已连接虎牙 ${roomid}房间弹幕~`)
})

client.on('message', msg => {
    switch(msg.type){
        case 'chat':
            console.log(`[${msg.from.name}]:${msg.content}`)
            break
        case 'gift':
            console.log(`[${msg.from.name}]->赠送${msg.count}个${msg.name}`)
            break
        default:
            //do what you like
            break
    }
})

client.on('error', e => {
    console.log(e)
})

client.on('close', () => {
    console.log('close')
})

client.start()
```

## API

### 开始监听弹幕

```javascript
const huya_danmu = require('huya-danmu')
const roomid = 'kaerlol'
const client = new huya_danmu(roomid)
client.start()
```

### 停止监听弹幕

```javascript
client.stop()
```

### 监听事件

```javascript
client.on('connect', () => {
    console.log('connect')
})

client.on('message', msg => {
    console.log('message',msg)
})

client.on('error', e => {
    console.log('error',e)
})

client.on('close', () => {
    console.log('close')
})
```

### 断线重连

```javascript
client.on('close', () => {
    client.start()
})
```

### msg对象

msg对象type有chat,gift,online三种值
分别对应聊天内容、礼物、在线人数

#### chat消息
```javascript
    {
        type: 'chat',
        time: '毫秒时间戳(服务器无返回time,此处为本地收到消息时间),Number',
        from: {
            name: '发送者昵称,String',
            rid: '发送者rid,String',
        },
        content: '聊天内容,String',
        raw: '原始消息,Object'
    }
```

#### gift消息
```javascript
    {
        type: 'gift',
        time: '毫秒时间戳(服务器无返回time,此处为本地收到消息时间),Number',
        name: '礼物名称,String',
        from: {
            name: '发送者昵称,String',
            rid: '发送者rid,String',
        },
        count: '礼物数量,Number',
        price: '礼物总价值(单位Y币),Number',
        id: '唯一ID,String',
        raw: '原始消息,Object'
    }
```

#### online消息
```javascript
    {
        type: 'online',
        time: '毫秒时间戳(服务器无返回time,此处为本地收到消息时间),Number',
        count: '当前人气值,Number',
        raw: '原始消息,Object'
    }
```