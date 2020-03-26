/*
 *  检测设备支持情况
 */
let env = {};
//tools --- 浏览器环境检测
function detect(ua) {
    let os = {};
    let browser = {};

    let firefox = ua.match(/Firefox\/([\d.]+)/);
    let ie = ua.match(/MSIE\s[\d.]+/) || ua.match(/Trident\/.+?rv:(([\d.]+))/); // ie7 || ie11
    let edge = ua.match(/Edge\/([\d.]+)/); // ie12 +
    let weChat = /micromessenger/i.test(ua);

    if (firefox) {
        browser.firefox = true;
        browser.version = firefox[1];
    }

    if (ie) {
        browser.ie = true;
        browser.version = ie[1];
    }

    if (edge) {
        browser.edge = true;
        browser.version = edge[1];
    }

    if (weChat) {
        browser.weChat = true;
    }

    return {
        browser: browser,
        os: os,
        node: false,
        canvasSupported: !!document.createElement("canvas").getContext,
        svgSupported: typeof SVGRect !== "undefined",
        touchEventsSupported: "ontouchstart" in window && !browser.ie && !browser.edge,
        pointerEventsSupported: "onpointerdown" in window && (browser.edge || (browser.ie && browser.version >= 11)),
        domSupported: typeof document !== "undefined"
    };
}

if (typeof wx === "object" && typeof wx.getSystemInfoSync === "function") {
    // 判断微信环境
    env = {
        browser: {},
        os: {},
        node: false,
        wxa: true, // Weixin Application
        canvasSupported: true,
        svgSupported: false,
        touchEventsSupported: true,
        domSupported: false
    };
} else if (typeof document === "undefined" && typeof self !== "undefined") {
    // web worker 环境
    env = {
        browser: {},
        os: {},
        node: false,
        worker: true,
        canvasSupported: true,
        domSupported: false
    };
} else if (typeof navigator === "undefined") {
    // node 环境
    env = {
        browser: {},
        os: {},
        node: true,
        worker: false,
        // Assume canvas is supported
        canvasSupported: true,
        svgSupported: true
    };
} else {
    //浏览器环境检测
    env = detect(navigator.userAgent);
}

export default env;
