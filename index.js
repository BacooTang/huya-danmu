const ws = require('ws')
const events = require('events')
const request = require('request-promise')
const to_arraybuffer = require('to-arraybuffer')
const { Taf, TafMx, HUYA } = require('./lib')
const REQUEST_TIMEOUT = 10000
const HEARTBEAT_INTERVAL = 60000
const FRESH_GIFT_INTERVAL = 30 * 60 * 1000


class huya_danmu extends events {

    constructor(roomid) {
        super()
        this._roomid = roomid
    }

    async _get_chat_info() {
        let opt = {
            url: `http://m.huya.com/${this._roomid}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Mobile Safari/537.36'
            },
            timeout: REQUEST_TIMEOUT,
            gzip: true
        }
        try {
            let body = await request(opt)
            let subsid_array = body.match(/SUBSID = '(\d+)'/)
            if (!subsid_array || !subsid_array[1]) {
                return null
            }
            let topsid_array = body.match(/TOPSID = '(\d+)'/)
            if (!topsid_array || !topsid_array[1]) {
                return null
            }
            let yyuid_array = body.match(/ayyuid: '(\d+)'/)
            if (!yyuid_array || !yyuid_array[1]) {
                return null
            }
            let type = 'normal'
            if (body.indexOf('type-yanzhi') > -1) {
                type = 'yanzhi'
            }
            return {
                subsid: subsid_array[1],
                topsid: topsid_array[1],
                type: type,
                yyuid: yyuid_array[1]
            }
        } catch (e) {
            return null
        }
    }

    async start() {
        if (this._starting) {
            return
        }
        this._starting = true
        this._info = await this._get_chat_info()
        if (!this._info || !this._starting) {
            this.emit('error', new Error('Fail to get info'))
            return this.emit('close')
        }
        this._is_yanzhi = "yanzhi" == this._info.type
        this._main_user_id = new HUYA.UserId()
        this._main_user_id.lUid = this._info.yyuid
        this._main_user_id.sHuYaUA = "webh5&1.0.0&websocket"
        this._start_ws()
    }


    _start_ws() {
        this._client = new ws("ws://ws.api.huya.com", {
            perMessageDeflate: false
        })
        this._client.on('open', () => {
            this._heartbeat()
            this._heartbeat_timer = setInterval(this._heartbeat.bind(this), 60000)
            let launch_req = new HUYA.LiveLaunchReq()
            launch_req.tId = this._main_user_id
            launch_req.tLiveUB.eSource = HUYA.ELiveSource.WEB_HUYA
            this._send_wup("liveindeui", "doLaunch", launch_req)
            this._get_gift_list()
            this._fresh_gift_list_timer = setInterval(this._get_gift_list.bind(this), FRESH_GIFT_INTERVAL)
        })
        this._client.on('error', err => {
            this.emit('error', err)
        })
        this._client.on('close', () => {
            this._stop()
            this.emit('close')
        })
        this._client.on('message', this._on_mes.bind(this))
        this.on("doLaunch", () => {
            if (!this._starting) {
                return
            }
            this._main_user_id.sGuid = this._info.sGuid
            this._bind_ws_info()
            let user_channel_req = new HUYA.UserChannelReq()
            user_channel_req.tId = this._main_user_id
            user_channel_req.lTopcid = this._info.topsid
            user_channel_req.lSubcid = this._info.subsid
            user_channel_req.sSendContent = ""
            this._send_wup("liveui", "userIn", user_channel_req)
        })
        this.on("8006", msg => {
            if (!this._starting) {
                return
            }
            let msg_obj = {
                type: 'online',
                time: new Date().getTime(),
                count: msg.iAttendeeCount,
                raw: msg
            }
            this.emit('message', msg_obj)
        })
        this.on("1400", msg => {
            if (msg.lPid != this._info.yyuid || !this._starting) {
                return
            }
            let msg_obj = {
                type: 'chat',
                time: new Date().getTime(),
                from: {
                    name: msg.tUserInfo.sNickName,
                    rid: msg.tUserInfo.lUid + '',
                },
                content: msg.sContent,
                raw: msg
            }
            this.emit('message', msg_obj)
        })
        this.on("6501", msg => {
            if (msg.lPresenterUid != this._info.yyuid || !this._starting) {
                return
            }
            let gift = this._gift_info[msg.iItemType + '']
            let msg_obj = {
                type: 'gift',
                time: new Date().getTime(),
                name: gift.name,
                from: {
                    name: msg.sSenderNick,
                    rid: msg.lSenderUid + ''
                },
                count: msg.iItemCount,
                price: msg.iItemCount * gift.price,
                raw: msg
            }
            this.emit('message', msg_obj)
        })
        this.on("getPropsList", msg => {
            if (!this._starting) {
                return
            }
            this._gift_info = this._gift_info || {}
            msg.vPropsItemList.value.forEach(item => {
                this._gift_info[item.iPropsId + ''] = {
                    name: item.sPropsName,
                    price: item.iPropsYb / 100
                }
            })
        })
    }

    _get_gift_list() {
        let prop_req = new HUYA.GetPropsListReq()
        prop_req.tUserId = this._main_user_id
        prop_req.iTemplateType = this._is_yanzhi ? HUYA.EClientTemplateType.TPL_MIRROR : HUYA.EClientTemplateType.TPL_PC
        this._send_wup("PropsUIServer", "getPropsList", prop_req)
    }

    _bind_ws_info() {
        let ws_user_info = new HUYA.WSUserInfo;
        ws_user_info.lUid = this._info.yyuid
        ws_user_info.bAnonymous = 0 == this._info.yyuid
        ws_user_info.sGuid = this._main_user_id.sGuid
        ws_user_info.sToken = ""
        ws_user_info.lTid = this._info.topsid
        ws_user_info.lSid = this._info.subsid
        ws_user_info.lGroupId = 0
        ws_user_info.lGroupType = 0
        let jce_stream = new Taf.JceOutputStream()
        ws_user_info.writeTo(jce_stream)
        let ws_command = new HUYA.WebSocketCommand()
        ws_command.iCmdType = HUYA.EWebSocketCommandType.EWSCmd_RegisterReq
        ws_command.vData = jce_stream.getBinBuffer()
        jce_stream = new Taf.JceOutputStream()
        ws_command.writeTo(jce_stream)
        this._client.send(jce_stream.getBuffer())
    }

    _heartbeat() {
        let heart_beat_req = new HUYA.UserHeartBeatReq()
        let user_id = new HUYA.UserId()
        user_id.sHuYaUA = "adr_wap"
        heart_beat_req.tId = user_id
        heart_beat_req.lTid = this._info.topsid
        heart_beat_req.lSid = this._info.subsid
        heart_beat_req.lShortTid = 0
        heart_beat_req.lPid = this._info.yyuid
        heart_beat_req.eLineType = 1
        heart_beat_req.iFps = 0
        heart_beat_req.iAttendee = this._info.totalCount
        heart_beat_req.iBandwidth = 0
        heart_beat_req.iLastHeartElapseTime = 0
        this._send_wup("onlineui", "OnUserHeartBeat", heart_beat_req)
    }

    _on_mes(data) {
        data = to_arraybuffer(data)
        let e = new Taf.JceInputStream(data)
        let i = new HUYA.WebSocketCommand()
        i.readFrom(e)
        switch (i.iCmdType) {
            case HUYA.EWebSocketCommandType.EWSCmd_WupRsp:
                let n = new Taf.Wup()
                n.decode(i.vData.buffer)
                let s = TafMx.WupMapping[n.sFuncName]
                if (s) {
                    s = new s()
                    let o = n.newdata.get("tRsp") ? "tRsp" : "tResp"
                    n.readStruct(o, s, TafMx.WupMapping[n.sFuncName])
                    this.emit(n.sFuncName, s)
                } else {
                    this.emit(n.sFuncName)
                }
                break
            case HUYA.EWebSocketCommandType.EWSCmdS2C_MsgPushReq:
                e = new Taf.JceInputStream(i.vData.buffer)
                let h = new HUYA.WSPushMessage()
                h.readFrom(e)
                e = new Taf.JceInputStream(h.sMsg.buffer)
                let p = TafMx.UriMapping[h.iUri]
                if (p) {
                    p = new p()
                    p.readFrom(e)
                    this.emit(h.iUri, p)
                }
                break
            default:
                break
        }
    }

    _send_wup(t, e, r) {
        let n = new Taf.Wup()
        n.setServant(t)
        n.setFunc(e)
        n.writeStruct("tReq", r)
        let s = new HUYA.WebSocketCommand()
        s.iCmdType = HUYA.EWebSocketCommandType.EWSCmd_WupReq
        s.vData = n.encode()
        let o = new Taf.JceOutputStream()
        s.writeTo(o)
        try {
            this._client.send(o.getBuffer())
        } catch (err) {
            this.emit('error', err)
        }
    }

    _stop() {
        this._starting = false
        clearInterval(this._heartbeat_timer)
        clearInterval(this._fresh_gift_list_timer)
        this._client && this._client.terminate()
    }

    stop() {
        this.removeAllListeners()
        this._stop()
    }
}

module.exports = huya_danmu