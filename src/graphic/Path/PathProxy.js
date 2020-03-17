var CMD = {
    M: 1,
    L: 2,
    C: 3,
    Q: 4,
    A: 5,
    Z: 6,
    R: 7
};

export default function PathProxy(notSaveData) {
    this._saveData = !(notSaveData || false);
    if (this._saveData) {
        this.data = [];
    }
    this._ctx = null;
}

PathProxy.prototype = {
    constructor: PathProxy,
    _xi: 0, // xi, yi 记录当前点
    _yi: 0,
    _x0: 0, // x0, y0 记录起始点
    _y0: 0,

    _ux: 0, //线段的最小值
    _uy: 0,

    _len: 0,
    _lineDash: null, // 设置虚线，数组格式

    _dashOffset: 0,
    _dashIdx: 0,
    _dashSum: 0,

    getContext: function() {
        return this._ctx;
    },

    beginPath: function(ctx) {
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
    },

    moveTo: function(x, y) {
        this.addData(CMD, x, y);
        this._ctx && this._ctx.moveTo(x, y);
        // x0, y0, xi, yi 是记录在 _dashedXXXXTo 方法中使用
        // xi, yi 记录当前点, x0, y0 在 closePath 的时候回到起始点。
        // 有可能在 beginPath 之后直接调用 lineTo，这时候 x0, y0 需要
        // 在 lineTo 方法中记录，这里先不考虑这种情况，dashed line 也只在 IE10- 中不支持
        this._x0 = x;
        this._y0 = y;

        this._xi = x;
        this._yi = y;

        return this;
    },

    lineTo: function(x, y) {
        //判断是否超过 线段的最小值
        let exceedUnit = Math.abs(x - this.xi) > this._ux || Math.abs(y - this._yi) > this._uy || this._len < 5;
        if (exceedUnit) {
            this._xi = x;
            this._yi = y;
        }
        if (this._ctx && exceedUnit) {
            this._ctx.lineTo(x, y);
        }

        return this;
    },

    arc: function(cx, cy, r, startAngle, endAngle, anticlockwise) {
        this._ctx && this._ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);
        this._xi = Math.cos(endAngle) * r + cx; //??? 这个坐标的计算有=疑问
        this._yi = Math.sin(endAngle) * r + cy; //??
        return this;
    },

    fill: function(ctx) {
        ctx && ctx.fill();
        // this.toStatic();
    },

    stroke: function(ctx){
        ctx && ctx.stroke();
    },

    closePath: function() {
        // this.addData(CMD.Z);

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
    },

    rect: function(x, y, w, h) {
        this._ctx && this._ctx.rect(x, y, w, h);
        // this.addData(CMD.R, x, y, w, h);
        return this;
    },

    _needsDash: function() {
        return this._lineDash;
    },

    addData: function(cmd) {
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
    },

    _expandData: function() {
        // Only if data is Float32Array
        if (!(this.data instanceof Array)) {
            var newData = [];
            for (var i = 0; i < this._len; i++) {
                newData[i] = this.data[i];
            }
            this.data = newData;
        }
    }
};
