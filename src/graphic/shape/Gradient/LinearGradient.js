import Gradient from "./Gradient";

/**
 * @method constructor LinearGradient
 * @param {Number} [x=0]
 * @param {Number} [y=0]
 * @param {Number} [x2=1]
 * @param {Number} [y2=0]
 * @param {Array<Object>} colorStops
 * @param {boolean} [globalCoord=false]
 */
export default class LinearGradient extends Gradient {
    constructor(x = 0, y = 0, x2 = 1, y2 = 0, colorStops, globalCoord) {
        super(colorStops);
        this.x = x;
        this.y = y;
        this.x2 = x2;
        this.y2 = y2;

        this.type = "linear";
        this.global = globalCoord || false;
    }
}
