(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.HumbleRneder = {}));
}(this, (function (exports) { 'use strict';

    function test () {
        console.log('123');
    }

    exports.test = test;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=humble-render.js.map
