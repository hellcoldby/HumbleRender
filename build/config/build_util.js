const rollup = require("rollup");
const fs = require("fs");
const path = require("path");

exports.watch = function (config) {
    let watch = rollup.watch(config);

    watch.on("event", (event) => {
        // console.log(event);
        // event.code 会是下面其中一个：
        //   START        — 监听器正在启动（重启）
        //   BUNDLE_START — 构建单个文件束
        //   BUNDLE_END   — 完成文件束构建
        //   END          — 完成所有文件束构建
        //   ERROR        — 构建时遇到错误
        //   FATAL        — 遇到无可修复的错误

        //开始 结束的时间
        if (event.code !== "START" && event.code !== "END") {
            console.log(`${new Date().toLocaleString()}`);

            // event.code.replace(/_/g, " ").toLowerCase();
        }

        //有错误
        if (event.code === "ERROR" || event.code === "FATAL") {
            console.log(`错误` + event.error);
            console.log(event.error.loc);
            fs.writeFile(path.resolve(__dirname, "./error.json"), `${JSON.stringify(event.error)}`, function (err) {
                if (err) {
                    throw err;
                }
                console.log("错误文件写入: " + path.resolve(__dirname, "./error.json"));
            });
        }

        //完成构建
        if (event.code === "BUNDLE_END") {
            console.log(`输出路径：` + event.output.join(""));
            console.log(`输出耗时：` + event.duration + ` ms`);
        }
    });
};

exports.build = function (config) {
    return new Promise((res, rej) => {
        let index = 0;

        function buildSingle() {
            let singleConfig = config[index++];

            if (!singleConfig) {
                res();
                return;
            }

            console.log("开始打包");
            console.log("入口文件：" + singleConfig.input);
            // console.log('====>');
            // console.log('输出文件路径：' + singleConfig.output.file);

            rollup
                .rollup(singleConfig)
                .then((bundle) => bundle.write(singleConfig))
                .then(() => {
                    console.log("输出文件：" + singleConfig.output.file + " 成功");
                    buildSingle();
                })
                .catch((err) => {
                    console.log("错误" + err);
                    rej();
                });
        }

        buildSingle();
    });
};
