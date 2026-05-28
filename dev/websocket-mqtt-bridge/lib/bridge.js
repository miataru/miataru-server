'use strict';

var EventEmitter = require('events');
var configUtils = require('./config');
var topicUtils = require('./topic');
var miataruHttp = require('./miataruHttp');

function createBridge(options) {
    options = options || {};

    var config = options.config;
    var mqttModule = options.mqtt;
    var WebSocketImpl = options.WebSocket;
    var fetchImpl = options.fetch;
    var logger = options.logger || console;

    if (!config) {
        throw new Error('Bridge config is required');
    }

    if (!mqttModule || typeof mqttModule.connect !== 'function') {
        throw new Error('mqtt dependency with connect() is required');
    }

    if (typeof WebSocketImpl !== 'function') {
        throw new Error('WebSocket dependency is required');
    }

    var state = {
        mqttClient: null,
        ws: null,
        mqttConnected: false,
        stopped: false,
        reconnectDelayMs: config.reconnect.initialDelayMs,
        reconnectTimer: null
    };

    async function start() {
        await miataruHttp.verifyOrSetDeviceKey(config, { fetch: fetchImpl, logger: logger });
        await miataruHttp.setSloganBestEffort(config, { fetch: fetchImpl, logger: logger });
        await connectMqtt();
        connectWebSocket();
    }

    function stop() {
        state.stopped = true;

        if (state.reconnectTimer) {
            clearTimeout(state.reconnectTimer);
            state.reconnectTimer = null;
        }

        if (state.ws && typeof state.ws.close === 'function') {
            state.ws.close();
        }

        if (state.mqttClient && typeof state.mqttClient.end === 'function') {
            state.mqttClient.end();
        }
    }

    function connectMqtt() {
        return new Promise(function(resolve, reject) {
            var mqttUrl = configUtils.buildMqttUrl(config.mqtt);
            var mqttOptions = {
                queueQoSZero: false,
                reconnectPeriod: 1000
            };

            if (config.mqtt.clientId) {
                mqttOptions.clientId = config.mqtt.clientId;
            }

            if (config.mqtt.username) {
                mqttOptions.username = config.mqtt.username;
            }

            if (config.mqtt.password) {
                mqttOptions.password = config.mqtt.password;
            }

            var client = mqttModule.connect(mqttUrl, mqttOptions);
            state.mqttClient = client;

            client.once('connect', function() {
                state.mqttConnected = true;
                logger.info('Connected to MQTT broker at ' + mqttUrl);
                resolve();
            });

            client.once('error', function(error) {
                if (!state.mqttConnected) {
                    reject(error);
                }
            });

            client.on('connect', function() {
                state.mqttConnected = true;
            });

            client.on('close', function() {
                state.mqttConnected = false;
            });
        });
    }

    function connectWebSocket() {
        if (state.stopped) {
            return;
        }

        logger.info('Connecting to Miataru WebSocket at ' + config.miataru.webSocketUrl);
        var ws = new WebSocketImpl(config.miataru.webSocketUrl);
        state.ws = ws;

        ws.on('open', function() {
            state.reconnectDelayMs = config.reconnect.initialDelayMs;
            ws.send(JSON.stringify(buildSubscribeMessage(config)));
            logger.info('Subscribed to ' + config.subscriptions.deviceIds.length + ' Miataru device(s).');
        });

        ws.on('message', function(message) {
            handleWebSocketMessage(message);
        });

        ws.on('close', function(code, reason) {
            if (state.stopped) {
                return;
            }

            logger.warn('Miataru WebSocket closed: ' + code + ' ' + reason.toString());
            scheduleReconnect();
        });

        ws.on('error', function(error) {
            logger.warn('Miataru WebSocket error: ' + error.message);
        });
    }

    function scheduleReconnect() {
        if (state.reconnectTimer || state.stopped) {
            return;
        }

        var delay = state.reconnectDelayMs;
        state.reconnectDelayMs = Math.min(state.reconnectDelayMs * 2, config.reconnect.maxDelayMs);

        logger.warn('Reconnecting Miataru WebSocket in ' + delay + 'ms.');
        state.reconnectTimer = setTimeout(function() {
            state.reconnectTimer = null;
            connectWebSocket();
        }, delay);
    }

    function handleWebSocketMessage(message) {
        var parsed;

        try {
            parsed = JSON.parse(message.toString());
        } catch (error) {
            logger.warn('Ignoring non-JSON WebSocket message.');
            return;
        }

        extractLocations(parsed).forEach(function(location) {
            publishLocation(location);
        });
    }

    function publishLocation(location) {
        if (!location || !location.Device) {
            return;
        }

        if (!state.mqttConnected || !state.mqttClient || typeof state.mqttClient.publish !== 'function') {
            logger.warn('MQTT is disconnected; dropping live location for device ' + location.Device + '.');
            return;
        }

        var mqttTopic = topicUtils.buildLocationTopic(config.mqtt.topicPrefix, location.Device);
        state.mqttClient.publish(
            mqttTopic,
            JSON.stringify(location),
            { qos: 0, retain: false },
            function(error) {
                if (error) {
                    logger.warn('MQTT publish failed for ' + mqttTopic + ': ' + error.message);
                }
            }
        );
    }

    return {
        start: start,
        stop: stop,
        _handleWebSocketMessage: handleWebSocketMessage,
        _publishLocation: publishLocation,
        _state: state
    };
}

function buildSubscribeMessage(config) {
    return {
        type: 'subscribe',
        MiataruConfig: {
            RequestMiataruDeviceID: config.miataru.deviceId,
            RequestMiataruDeviceKey: config.miataru.deviceKey
        },
        MiataruGetLocation: config.subscriptions.deviceIds.map(function(deviceId) {
            return { Device: deviceId };
        })
    };
}

function extractLocations(message) {
    if (!message) {
        return [];
    }

    if (message.type === 'subscription' && Array.isArray(message.MiataruLocation)) {
        return message.MiataruLocation.filter(Boolean);
    }

    if (message.Device) {
        return [message];
    }

    return [];
}

function createFakeMqttClient() {
    return new EventEmitter();
}

module.exports = {
    createBridge: createBridge,
    buildSubscribeMessage: buildSubscribeMessage,
    extractLocations: extractLocations,
    createFakeMqttClient: createFakeMqttClient
};
