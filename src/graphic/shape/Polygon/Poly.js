/**
 * 多边形
 * @module zrender/shape/Polygon
 */

import smoothSpline from "./helper/smoothSpline";
import smoothBezier from "./helper/smoothBezier";

import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";

export default class Polygon extends Path {
    constructor(opts) {
        let defaultConfig = {
            shape: {
                points: null,
                smooth: false,
                smoothConstraint: null,
            },
        };
        let mergeOpts = merge(defaultConfig, opts, true);
        // console.log(mergeOpts);
        super(mergeOpts);

        this.type = "polygon";
    }

    buildPath(ctx, shape, closePath = true) {
        var points = shape.points;
        var smooth = shape.smooth;
        var i = 0;
        var l = 0;
        if (points && points.length >= 2) {
            if (smooth && smooth !== "spline") {
                //计算出控制手柄
                var controlPoints = smoothBezier(points, smooth, closePath, shape.smoothConstraint);

                ctx.moveTo(points[0][0], points[0][1]);

                var len = points.length;
                for (i = 0; i < (closePath ? len : len - 1); i++) {
                    var cp1 = controlPoints[i * 2];
                    var cp2 = controlPoints[i * 2 + 1];
                    var p = points[(i + 1) % len];
                    ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]);
                }
            } else {
                if (smooth === "spline") {
                    points = smoothSpline(points, closePath);
                }

                ctx.moveTo(points[0][0], points[0][1]);
                for (i = 1, l = points.length; i < l; i++) {
                    ctx.lineTo(points[i][0], points[i][1]);
                }
            }

            closePath && ctx.closePath();
        }
    }
}
