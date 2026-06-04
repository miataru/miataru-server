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
        reconnectTimer: null,
        activityTimer: null
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

        clearActivityTimer();

        if (state.ws && typeof state.ws.close === 'function') {
            state.ws.close();
        }
        state.ws = null;

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

            client.on('error', function(error) {
                if (state.mqttConnected) {
                    logError('MQTT broker error: ' + error.message);
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
            resetActivityTimer(ws);
            ws.send(JSON.stringify(buildSubscribeMessage(config)));
            logger.info('Sent subscription request for ' + config.subscriptions.deviceIds.length + ' Miataru device(s).');
        });

        ws.on('message', function(message) {
            resetActivityTimer(ws);
            handleWebSocketMessage(message);
        });

        ws.on('ping', function() {
            resetActivityTimer(ws);
        });

        ws.on('pong', function() {
            resetActivityTimer(ws);
        });

        ws.on('close', function(code, reason) {
            if (state.ws !== ws) {
                return;
            }

            clearActivityTimer();
            state.ws = null;

            if (state.stopped) {
                return;
            }

            logger.warn('Miataru WebSocket closed: ' + code + ' ' + formatCloseReason(reason));
            scheduleReconnect();
        });

        ws.on('error', function(error) {
            if (state.ws !== ws || state.stopped) {
                return;
            }

            logError('Miataru WebSocket error: ' + error.message);
            reconnectWebSocket(ws, 'Miataru WebSocket error; reconnecting.');
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

    function resetActivityTimer(ws) {
        if (state.stopped || state.ws !== ws) {
            return;
        }

        clearActivityTimer();
        state.activityTimer = setTimeout(function() {
            if (state.stopped || state.ws !== ws) {
                return;
            }

            reconnectWebSocket(ws, 'Miataru WebSocket inactive for ' + config.reconnect.inactivityTimeoutMs + 'ms; reconnecting.');
        }, config.reconnect.inactivityTimeoutMs);
    }

    function clearActivityTimer() {
        if (!state.activityTimer) {
            return;
        }

        clearTimeout(state.activityTimer);
        state.activityTimer = null;
    }

    function reconnectWebSocket(ws, message) {
        if (state.stopped || state.ws !== ws) {
            return;
        }

        logger.warn(message);
        clearActivityTimer();
        state.ws = null;

        if (typeof ws.terminate === 'function') {
            ws.terminate();
        } else if (typeof ws.close === 'function') {
            ws.close();
        }

        scheduleReconnect();
    }

    function handleWebSocketMessage(message) {
        var parsed;

        try {
            parsed = JSON.parse(message.toString());
        } catch (error) {
            logger.warn('Ignoring non-JSON WebSocket message.');
            return;
        }

        logWebSocketMessage(parsed);

        extractLocations(parsed).forEach(function(location) {
            publishLocation(location);
        });
    }

    function logWebSocketMessage(message) {
        if (message && message.type === 'subscription' && Array.isArray(message.MiataruLocation)) {
            var nonNullLocations = message.MiataruLocation.filter(Boolean).length;
            var nullLocations = message.MiataruLocation.length - nonNullLocations;

            logger.info('Miataru subscription acknowledged: ' + nonNullLocations + ' initial location(s), ' + nullLocations + ' null/unavailable target(s).');

            if (nullLocations > 0) {
                logger.warn('Some subscribed targets returned null. They may be unknown, unavailable, or not authorized for the bridge device.');
            }

            return;
        }

        if (message && message.Device) {
            logger.info('Received Miataru location update for device ' + message.Device + ' with timestamp ' + (message.Timestamp || 'unknown') + '.');
            return;
        }

        logger.warn('Ignoring unsupported Miataru WebSocket message.');
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
                    logError('MQTT publish failed for ' + mqttTopic + ': ' + error.message);
                    return;
                }

                logger.info('Published Miataru location for device ' + location.Device + ' to MQTT topic ' + mqttTopic + '.');
            }
        );
    }

    function logError(message) {
        if (logger && typeof logger.error === 'function') {
            logger.error(message);
            return;
        }

        logger.warn(message);
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

function formatCloseReason(reason) {
    if (!reason) {
        return '';
    }

    return reason.toString();
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
