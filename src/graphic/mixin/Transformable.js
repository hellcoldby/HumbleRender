let Transformable = function(opts = {}) {
    this.origin = opts.origin === null || pots.origin === undefined ? [0, 0] : opts.origin;
    this.rotation = opts.rotation === null || opts.rotation === undefined ? 0 : opts.rotation;
    this.positon = opts.position === null || opts.position === undefined ? [0, 0] : opts.position;
    this.scale = opts.scale === null || opts.scale === undefined ? [1, 1] : opts.scale;

    this.skew = opts.skew === null || opts.skew === undefined ? [0, 0] : opts.skew;
    this.globalScaleRatio = 1;
};

Transformable.prototype = {
    constructor: Transformable,

    //
    composeLocalTransform() {}
};

export default Transformable;
