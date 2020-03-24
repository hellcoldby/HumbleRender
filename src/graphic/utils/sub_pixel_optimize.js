/**
 * Sub-pixel optimize for canvas rendering, prevent from blur when rendering a thin vertical/horizontal line.
 *  画布渲染优化， 防止水平或垂直线条变得模糊。
 */

/**
 * Sub pixel optimize line for canvas
 *
 * @param {Object} outputShape The modification will be performed on `outputShape`.
 *                 `outputShape` and `inputShape` can be the same object.
 *                 `outputShape` object can be used repeatly, because all of
 *                 the `x1`, `x2`, `y1`, `y2` will be assigned in this method.
 * @param {Object} [inputShape]
 * @param {Number} [inputShape.x1]
 * @param {Number} [inputShape.y1]
 * @param {Number} [inputShape.x2]
 * @param {Number} [inputShape.y2]
 * @param {Object} [style]
 * @param {Number} [style.lineWidth]
 */
export function subPixelOptimizeLine(outputShape, inputShape, style) {
    var lineWidth = style && style.lineWidth;

    if (!inputShape || !lineWidth) {
        return;
    }

    var x1 = inputShape.x1;
    var x2 = inputShape.x2;
    var y1 = inputShape.y1;
    var y2 = inputShape.y2;

    if (Math.round(x1 * 2) === Math.round(x2 * 2)) {
        outputShape.x1 = outputShape.x2 = subPixelOptimize(x1, lineWidth, true);
    } else {
        outputShape.x1 = x1;
        outputShape.x2 = x2;
    }
    if (Math.round(y1 * 2) === Math.round(y2 * 2)) {
        outputShape.y1 = outputShape.y2 = subPixelOptimize(y1, lineWidth, true);
    } else {
        outputShape.y1 = y1;
        outputShape.y2 = y2;
    }
}

/**
 * Sub pixel optimize rect for canvas
 *
 * @param {Object} outputShape The modification will be performed on `outputShape`.
 *                 `outputShape` and `inputShape` can be the same object.
 *                 `outputShape` object can be used repeatly, because all of
 *                 the `x`, `y`, `width`, `height` will be assigned in this method.
 * @param {Object} [inputShape]
 * @param {Number} [inputShape.x]
 * @param {Number} [inputShape.y]
 * @param {Number} [inputShape.width]
 * @param {Number} [inputShape.height]
 * @param {Object} [style]
 * @param {Number} [style.lineWidth]
 */
export function subPixelOptimizeRect(outputShape, inputShape, style) {
    var lineWidth = style && style.lineWidth;

    if (!inputShape || !lineWidth) {
        return;
    }

    var originX = inputShape.x;
    var originY = inputShape.y;
    var originWidth = inputShape.width;
    var originHeight = inputShape.height;

    outputShape.x = subPixelOptimize(originX, lineWidth, true);
    outputShape.y = subPixelOptimize(originY, lineWidth, true);
    outputShape.width = Math.max(subPixelOptimize(originX + originWidth, lineWidth, false) - outputShape.x, originWidth === 0 ? 0 : 1);
    outputShape.height = Math.max(subPixelOptimize(originY + originHeight, lineWidth, false) - outputShape.y, originHeight === 0 ? 0 : 1);
}

/**
 * Sub pixel optimize for canvas
 *
 * @param {Number} position Coordinate, such as x, y
 * @param {Number} lineWidth Should be nonnegative integer.
 * @param {boolean=} positiveOrNegative Default false (negative).  正数 或 负数
 * @return {Number} Optimized position.
 */
export function subPixelOptimize(position, lineWidth, positiveOrNegative) {
    // Assure that (position + lineWidth / 2) is near integer edge,  确保 在整数附近
    // otherwise line will be fuzzy in canvas. 否则会模糊
    var doubledPosition = Math.round(position * 2);
    return (doubledPosition + Math.round(lineWidth)) % 2 === 0 ? doubledPosition / 2 : (doubledPosition + (positiveOrNegative ? 1 : -1)) / 2;
}
