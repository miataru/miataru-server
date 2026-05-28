'use strict';

var fs = require('fs');
var path = require('path');
var topic = require('./topic');

function loadConfigFile(configPath) {
    if (!configPath) {
        throw new Error('Missing --config <path>');
    }

    var resolvedPath = path.resolve(configPath);
    var raw;

    try {
        raw = fs.readFileSync(resolvedPath, 'utf8');
    } catch (error) {
        throw new Error('Could not read config file: ' + error.message);
    }

    var parsed;

    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error('Config file is not valid JSON: ' + error.message);
    }

    return normalizeConfig(parsed);
}

function normalizeConfig(config) {
    config = config || {};

    var miataru = config.miataru || {};
    var subscriptions = config.subscriptions || {};
    var mqtt = config.mqtt || {};

    var normalized = {
        miataru: {
            baseUrl: normalizeBaseUrl(requiredString(miataru.baseUrl, 'miataru.baseUrl')),
            webSocketUrl: miataru.webSocketUrl ? normalizeWebSocketUrl(miataru.webSocketUrl) : null,
            deviceId: requiredString(miataru.deviceId, 'miataru.deviceId'),
            deviceKey: requiredString(miataru.deviceKey, 'miataru.deviceKey'),
            slogan: requiredString(miataru.slogan, 'miataru.slogan')
        },
        subscriptions: {
            deviceIds: normalizeDeviceIds(subscriptions.deviceIds)
        },
        mqtt: {
            brokerAddress: requiredString(mqtt.brokerAddress, 'mqtt.brokerAddress'),
            port: requiredPort(mqtt.port, 'mqtt.port'),
            username: optionalString(mqtt.username, 'mqtt.username'),
            password: optionalString(mqtt.password, 'mqtt.password'),
            topicPrefix: topic.normalizeTopicPrefix(requiredString(mqtt.topicPrefix, 'mqtt.topicPrefix')),
            clientId: optionalString(mqtt.clientId, 'mqtt.clientId')
        },
        reconnect: {
            initialDelayMs: optionalPositiveInteger(config.reconnect && config.reconnect.initialDelayMs, 1000, 'reconnect.initialDelayMs'),
            maxDelayMs: optionalPositiveInteger(config.reconnect && config.reconnect.maxDelayMs, 30000, 'reconnect.maxDelayMs')
        }
    };

    if (!normalized.miataru.webSocketUrl) {
        normalized.miataru.webSocketUrl = deriveWebSocketUrl(normalized.miataru.baseUrl);
    }

    return normalized;
}

function deriveWebSocketUrl(baseUrl) {
    var parsed = new URL(baseUrl);

    if (parsed.protocol === 'https:') {
        parsed.protocol = 'wss:';
    } else if (parsed.protocol === 'http:') {
        parsed.protocol = 'ws:';
    } else {
        throw new Error('miataru.baseUrl must use http or https');
    }

    parsed.pathname = joinUrlPath(parsed.pathname, '/v1/ws/location');
    parsed.search = '';
    parsed.hash = '';

    return parsed.toString();
}

function buildMqttUrl(mqttConfig) {
    var brokerAddress = mqttConfig.brokerAddress;
    var hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(brokerAddress);
    var parsed = new URL(hasProtocol ? brokerAddress : 'mqtt://' + brokerAddress);

    parsed.port = String(mqttConfig.port);

    return parsed.toString();
}

function requiredString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(fieldName + ' must be a non-empty string');
    }

    return value.trim();
}

function optionalString(value, fieldName) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof value !== 'string') {
        throw new Error(fieldName + ' must be a string when provided');
    }

    return value;
}

function requiredPort(value, fieldName) {
    var numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 65535) {
        throw new Error(fieldName + ' must be an integer between 1 and 65535');
    }

    return numeric;
}

function optionalPositiveInteger(value, defaultValue, fieldName) {
    if (value === undefined || value === null) {
        return defaultValue;
    }

    var numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric <= 0) {
        throw new Error(fieldName + ' must be a positive integer');
    }

    return numeric;
}

function normalizeDeviceIds(deviceIds) {
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
        throw new Error('subscriptions.deviceIds must be a non-empty array');
    }

    return deviceIds.map(function(deviceId, index) {
        return requiredString(deviceId, 'subscriptions.deviceIds[' + index + ']');
    });
}

function normalizeBaseUrl(baseUrl) {
    var parsed = new URL(baseUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('miataru.baseUrl must use http or https');
    }

    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.search = '';
    parsed.hash = '';

    return parsed.toString().replace(/\/+$/, '');
}

function normalizeWebSocketUrl(webSocketUrl) {
    var parsed = new URL(webSocketUrl);

    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
        throw new Error('miataru.webSocketUrl must use ws or wss');
    }

    return parsed.toString();
}

function joinUrlPath(basePath, suffix) {
    var normalizedBase = basePath && basePath !== '/' ? basePath.replace(/\/+$/, '') : '';
    return normalizedBase + suffix;
}

module.exports = {
    loadConfigFile: loadConfigFile,
    normalizeConfig: normalizeConfig,
    deriveWebSocketUrl: deriveWebSocketUrl,
    buildMqttUrl: buildMqttUrl
};
