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

    addData(cmd) {
        if (!this._saveData) {
            return;
        }

        var data = this.data;
        // if(this._len + arguments.length > data.length) {
        //     this._expandData();
        //     data = this.data;
        // }
    }
}
