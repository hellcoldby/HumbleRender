export default class Track {
    constructor(opts) {
        this._target = opts._target;
        this._delay = opts._delay;

        this.isFinished = false;
        this.keyFrames = [];
        this.timeline;
    }

    addKeyFrame(kf) {
        this.keyFrames.push(kf);
    }

    nextFrame(time, delta) {}
}
