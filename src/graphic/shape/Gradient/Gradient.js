export default class Gradient {
    constructor(colorStops) {
        this.colorStops = colorStops || [];
    }

    addColorStop(offset, color) {
        this.colorStops.push({
            offset: offset,
            color: color
        });
    }
}
