import Gradient from "./Gradient";

/**
 * @method constructor RadialGradient
 * @param {Number} [x=0.5]
 * @param {Number} [y=0.5]
 * @param {Number} [r=0.5]
 * @param {Array<Object>} [colorStops]
 * @param {boolean} [globalCoord=false]
 */
export default class RadialGradient extends Gradient {
    constructor(x = 0.5, y = 0.5, r = 0.5, colorStops, globalCoord) {
        super(colorStops);
        this.type = "radial";
        this.global = globalCoord || false;
    }
}
