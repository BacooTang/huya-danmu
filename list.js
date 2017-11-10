class list {
    constructor() {
        this._list = []
        this._max_count = 100
        this._max_time = 1000
    }

    push(name, time) {
        for (let i = 0; i < this._list.length; i++) {
            let item = this._list[i]
            if (item.name == name && time - item.time < this._max_time) {
                return false
            }
        }
        this._list.push({ name: name, time: time })
        if (this._list.length >= this._max_count) {
            this._list = this._list.splice(1)
        }
        return true
    }
}

module.exports = list