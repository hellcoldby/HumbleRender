
class Path {
    constructor(opts) {
        this.type = 'path';
        this.path = null;
        this.__dirtyPath = true;

        this.strokeContainThreshold = 5; //绘制 临界值
        this.segmentIgnoreThreshold = 0; //部分 忽略 临界值
        this.subPixelOptimize=false;  //设备优化
    }

    brush(ctx, prevEl) {

    }

    getBoundingRect() {

    }

    contian(x, y){}

    dirty() {}

    setShape() {}

    getLineScale() {}
 }
 export default Path;