#!/usr/bin/env node
'use strict';

var mqtt = require('mqtt');
var WebSocket = require('ws');

var configUtils = require('./lib/config');
var bridgeModule = require('./lib/bridge');
var loggerUtils = require('./lib/logger');

function parseArgs(argv) {
    var configPath = null;
    var errorsOnly = false;

    for (var i = 0; i < argv.length; i++) {
        if (argv[i] === '--config' || argv[i] === '-c') {
            configPath = argv[i + 1];
            i += 1;
            continue;
        }

        if (argv[i] === '--errors-only') {
            errorsOnly = true;
            continue;
        }

        if (argv[i] === '--help' || argv[i] === '-h') {
            printUsage();
            process.exit(0);
        }
    }

    return {
        configPath: configPath,
        errorsOnly: errorsOnly
    };
}

function printUsage() {
    console.log('Usage: node bridge.js --config ./config.json [--errors-only]');
}

async function main() {
    var args = parseArgs(process.argv.slice(2));
    var config = configUtils.loadConfigFile(args.configPath);
    var logger = loggerUtils.createLogger({
        output: console,
        errorsOnly: args.errorsOnly
    });
    var bridge = bridgeModule.createBridge({
        config: config,
        mqtt: mqtt,
        WebSocket: WebSocket,
        logger: logger
    });

    process.on('SIGINT', function() {
        logger.info('Stopping bridge.');
        bridge.stop();
        process.exit(0);
    });

    process.on('SIGTERM', function() {
        logger.info('Stopping bridge.');
        bridge.stop();
        process.exit(0);
    });

    await bridge.start();
}

main().catch(function(error) {
    console.error('Bridge startup failed: ' + error.message);
    process.exit(1);
});
