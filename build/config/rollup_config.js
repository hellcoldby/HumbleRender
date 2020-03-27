const uglifyPlugin = require("rollup-plugin-uglify-es");
const path = require("path");
//tools -- 解析相对路径为绝对路径
function getPath(relativePath) {
    return path.resolve(__dirname, "../../", relativePath);
}

//tools -- 引用压缩插件
function getPlugins(min) {
    let plugins = [];
    min &&
        plugins.push(
            uglifyPlugin({
                compress: {
                    global_defs: { __DEV__: true }
                }
            })
        );
    return plugins;
}

//main -- 主函数 rollup 的配置文件
exports.createConfig = function(min, format) {
    let postfixMin = min ? ".min" : "";

    return {
        plugins: getPlugins(min),
        input: getPath(`./humble-render.js`),
        output: {
            name: "HumbleRender",
            format: format || 'umd',
            sourcemap: !min,
            file: getPath(`dist/humble-render${postfixMin}.js`)
        },
        watch: {
            include: [getPath("./src/**"), getPath("./humble-render*.js")]
        }
    };
};
