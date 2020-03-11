var CMD = {
    M: 1,
    L: 2,
    C: 3,
    Q: 4,
    A: 5,
    Z: 6,
    R: 7
};
export default class pathProxy {
    constructor(notSaveData) {
        this._saveData = !(notSaveData || false);

        if (this._saveData) {
            this.data = [];
        }

        this.ctx = null;
    }

    getContext() {
        return this._ctx;
    }

    beginPath(ctx) {
        this._ctx = ctx;
        ctx && ctx.beginPath();
        ctx && (this.dpr = ctx.dpr);

        //Reset
        if (this._saveData) {
            this._len = 0;
        }

        if (this._lineDash) {
            this._lineDash = null;
            this._dashOffset = 0;
        }
        return this;
    }

    moveTo(x, y) {
        this.addData(CMD, x, y);
        this._ctx && this._ctx.moveTo(x, y);
    }

    fill(ctx) {
        ctx && ctx.fill();
        this.toStatic();
    }

    closePath() {
        this.addData(CMD.Z);

        var ctx = this._ctx;
        var x0 = this._x0;
        var y0 = this._y0;
        if (ctx) {
            // this._needsDash() && this._dashedLineTo(x0, y0);
            ctx.closePath();
        }

        this._xi = x0;
        this._yi = y0;
        return this;
    }

    toStatic() {
        let data = this.data;
        if (data instanceof Array) {
            data.length = this._len;
            if (hasTypeArray) {
                this.data = new Float32Array(data);
            }
        }
    }

    addData(cmd) {
        if (!this._saveData) {
            return;
        }

        var data = this.data;
        if (this._len + arguments.length > data.length) {
            // 因为之前的数组已经转换成静态的 Float32Array
            // 所以不够用时需要扩展一个新的动态数组
            this._expandData();
            data = this.data;
        }
        for (var i = 0; i < arguments.length; i++) {
            data[this._len++] = arguments[i];
        }

        this._prevCmd = cmd;
    }

    _expandData() {
        // Only if data is Float32Array
        if (!(this.data instanceof Array)) {
            var newData = [];
            for (var i = 0; i < this._len; i++) {
                newData[i] = this.data[i];
            }
            this.data = newData;
        }
    }

    rect(x, y, w, h) {
        this._ctx && this._ctx.rect(x, y, w, h);
        this.addData(CMD.R, x, y, w, h);
        return this;
    }
}
