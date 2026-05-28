var url = require('url');
var WebSocket = require('ws');

var configuration = require('../configuration');
var db = require('../db');
var kb = require('../utils/keyBuilder');
var errors = require('../errors');
var logger = require('../logger');
var RequestConfigGetLocation = require('../models/RequestConfigGetLocation');
var RequestDevice = require('../models/RequestDevice');
var allowedDevicesUtils = require('../utils/allowedDevices');
var requesterAuth = require('../utils/requesterAuth');
var visitorHistory = require('../utils/visitorHistory');
var broker = require('./locationBroker');

var WS_PATH = '/v1/ws/location';
var KEY_LAST = 'last';
var KEY_VISIT = 'visit';
var KEY_SLOGAN = 'slogan';

var connectionCountsByIp = {};

function install(server) {
    if (!server || typeof server.on !== 'function') {
        throw new Error('HTTP server is required to install WebSocket location subscriptions');
    }

    var websocketConfig = getWebSocketConfig();
    var wss = new WebSocket.Server({
        noServer: true,
        maxPayload: websocketConfig.maxMessageBytes
    });

    server.on('upgrade', function(request, socket, head) {
        var parsedUrl = url.parse(request.url, true);

        if (parsedUrl.pathname !== WS_PATH) {
            socket.destroy();
            return;
        }

        if (!isTlsAllowed(request, websocketConfig)) {
            rejectUpgrade(socket, 403, 'WebSocket requires TLS');
            return;
        }

        if (queryContainsDeviceKey(parsedUrl.query)) {
            rejectUpgrade(socket, 400, 'DeviceKey is not accepted in WebSocket query strings');
            return;
        }

        if (!isOriginAllowed(request.headers.origin)) {
            rejectUpgrade(socket, 403, 'Forbidden origin');
            return;
        }

        var ip = request.socket && request.socket.remoteAddress ? request.socket.remoteAddress : 'unknown';

        if (getConnectionCount(ip) >= websocketConfig.maxConnectionsPerIp) {
            rejectUpgrade(socket, 429, 'Too Many Requests');
            return;
        }

        wss.handleUpgrade(request, socket, head, function(ws) {
            incrementConnectionCount(ip);
            wss.emit('connection', ws, request, ip, websocketConfig);
        });
    });

    wss.on('connection', function(ws, request, ip, websocketConfigForConnection) {
        handleConnection(ws, request, ip, websocketConfigForConnection);
    });

    return wss;
}

function handleConnection(ws, request, ip, websocketConfig) {
    var session = {
        socket: ws,
        ip: ip,
        request: request,
        requestingDeviceId: null,
        subscriptions: new Set(),
        maxBufferedBytes: websocketConfig.maxBufferedBytes
    };
    var authenticated = false;
    var alive = true;
    var authTimer = setTimeout(function() {
        if (!authenticated && ws.readyState === WebSocket.OPEN) {
            ws.close(1008, 'Subscription required');
        }
    }, websocketConfig.authTimeoutSeconds * 1000);
    var heartbeatTimer = setInterval(function() {
        if (ws.readyState !== WebSocket.OPEN) {
            return;
        }

        if (!alive) {
            ws.terminate();
            return;
        }

        alive = false;
        ws.ping();
    }, websocketConfig.heartbeatIntervalSeconds * 1000);
    var visitorRefreshTimer = setInterval(function() {
        refreshVisitorPresence(session);
    }, websocketConfig.visitorRefreshIntervalSeconds * 1000);

    ws.on('pong', function() {
        alive = true;
    });

    ws.on('message', function(message, isBinary) {
        if (isBinary) {
            ws.close(1008, 'Binary messages are not supported');
            return;
        }

        if (Buffer.byteLength(message) > websocketConfig.maxMessageBytes) {
            ws.close(1009, 'Message too large');
            return;
        }

        handleMessage(session, message, websocketConfig, function(error) {
            if (error) {
                closeForError(ws, error);
                return;
            }

            authenticated = true;
            clearTimeout(authTimer);
        });
    });

    ws.on('close', function() {
        clearTimeout(authTimer);
        clearInterval(heartbeatTimer);
        clearInterval(visitorRefreshTimer);
        broker.unsubscribeAll(session);
        decrementConnectionCount(ip);
    });

    ws.on('error', function(error) {
        logger.warn('WebSocket connection error from %s: %s', ip, error.message);
    });
}

function handleMessage(session, message, websocketConfig, callback) {
    var payload;

    try {
        payload = JSON.parse(message.toString());
    } catch (parseError) {
        return callback(new errors.BadRequestError('invalid JSON'));
    }

    if (!payload || payload.type !== 'subscribe') {
        return callback(new errors.BadRequestError('unsupported WebSocket message type'));
    }

    parseSubscription(payload, websocketConfig, function(error, parsedSubscription) {
        if (error) {
            return callback(error);
        }

        requesterAuth.validateRequestingDeviceKeyForGetLocation(parsedSubscription.requestConfig, function(authError) {
            if (authError) {
                return callback(authError);
            }

            session.requestingDeviceId = parsedSubscription.requestingDeviceId;
            authorizeSubscriptionTargets(parsedSubscription, function(subscriptionError, subscriptionResult) {
                if (subscriptionError) {
                    return callback(subscriptionError);
                }

                broker.replaceSubscriptions(session, subscriptionResult.authorizedDevices);
                session.socket.send(JSON.stringify({
                    type: 'subscription',
                    MiataruLocation: subscriptionResult.locations
                }));
                callback();
            });
        });
    });
}

function parseSubscription(payload, websocketConfig, callback) {
    var requestConfig;
    var devices;

    try {
        requestConfig = new RequestConfigGetLocation(payload.MiataruConfig || {});

        if (!requestConfig.requestMiataruDeviceID()) {
            throw new errors.BadRequestError('RequestMiataruDeviceID is required');
        }

        var locationRequests = payload.MiataruGetLocation;
        if (!Array.isArray(locationRequests)) {
            locationRequests = [{}];
        }

        if (locationRequests.length > websocketConfig.maxSubscriptionsPerSocket) {
            throw new errors.BadRequestError('too many WebSocket subscriptions requested');
        }

        devices = locationRequests.map(function(device) {
            return new RequestDevice(device);
        });
    } catch (error) {
        return callback(error);
    }

    callback(null, {
        requestConfig: requestConfig,
        requestingDeviceId: requestConfig.requestMiataruDeviceID(),
        devices: devices
    });
}

function authorizeSubscriptionTargets(subscription, callback) {
    var responseLocations = new Array(subscription.devices.length);
    var authorizedDevices = [];
    var pending = subscription.devices.length;
    var finished = false;

    if (pending === 0) {
        return callback(null, { locations: responseLocations, authorizedDevices: authorizedDevices });
    }

    subscription.devices.forEach(function(device, index) {
        authorizeOneTarget(subscription, device.device(), function(error, result) {
            if (finished) {
                return;
            }

            if (error) {
                finished = true;
                return callback(error);
            }

            responseLocations[index] = result.location;

            if (result.authorized) {
                authorizedDevices.push(device.device());
            }

            pending -= 1;
            if (pending === 0) {
                callback(null, {
                    locations: responseLocations,
                    authorizedDevices: uniqueDeviceIds(authorizedDevices)
                });
            }
        });
    });
}

function authorizeOneTarget(subscription, targetDeviceId, callback) {
    db.get(kb.build(targetDeviceId, KEY_LAST), function(error, reply) {
        if (error) {
            return callback(error);
        }

        if (reply !== null && reply !== undefined) {
            touchVisitorForTarget(subscription.requestConfig, targetDeviceId);
        }

        allowedDevicesUtils.checkAccess(
            targetDeviceId,
            subscription.requestingDeviceId,
            allowedDevicesUtils.ACCESS_TYPE_CURRENT_LOCATION,
            function(accessError, hasAccess) {
                if (accessError) {
                    return callback(accessError);
                }

                if (!hasAccess) {
                    return callback(null, { authorized: false, location: null });
                }

                if (reply === null || reply === undefined) {
                    return callback(null, { authorized: true, location: null });
                }

                parseInitialLocation(targetDeviceId, reply, function(parseError, locationData) {
                    if (parseError) {
                        return callback(parseError);
                    }

                    callback(null, { authorized: true, location: locationData });
                });
            }
        );
    });
}

function parseInitialLocation(targetDeviceId, reply, callback) {
    var serialized = Buffer.isBuffer(reply) ? reply.toString() : reply;
    var locationData;

    try {
        locationData = JSON.parse(serialized);
    } catch (parseError) {
        logger.warn('Invalid location data format for WebSocket snapshot on device %s', targetDeviceId);
        return callback(null, null);
    }

    db.get(kb.build(targetDeviceId, KEY_SLOGAN), function(error, sloganReply) {
        if (error) {
            return callback(error);
        }

        if (Buffer.isBuffer(sloganReply)) {
            sloganReply = sloganReply.toString();
        }

        locationData.Slogan = sloganReply !== null && sloganReply !== undefined ? sloganReply : null;
        callback(null, locationData);
    });
}

function refreshVisitorPresence(session) {
    if (!session || !session.requestingDeviceId || !session.subscriptions || session.subscriptions.size === 0) {
        return;
    }

    Array.from(session.subscriptions).forEach(function(targetDeviceId) {
        db.get(kb.build(targetDeviceId, KEY_LAST), function(error, reply) {
            if (error) {
                logger.warn('WebSocket visitor refresh failed for %s: %s', targetDeviceId, error.message);
                return;
            }

            if (reply === null || reply === undefined) {
                return;
            }

            touchVisitorForTarget({
                requestMiataruVisitorObject: function(deviceId) {
                    if (session.requestingDeviceId === deviceId) {
                        return null;
                    }

                    return {
                        DeviceID: session.requestingDeviceId,
                        TimeStamp: Date.now()
                    };
                }
            }, targetDeviceId);
        });
    });
}

function touchVisitorForTarget(requestConfig, targetDeviceId) {
    var visitorObject = requestConfig.requestMiataruVisitorObject(targetDeviceId);

    if (visitorObject === null) {
        return;
    }

    visitorHistory.touchVisitorHistory(kb.build(targetDeviceId, KEY_VISIT), visitorObject);
}

function closeForError(ws, error) {
    if (!error) {
        ws.close(1011, 'Internal Server Error');
        return;
    }

    if (error.statusCode === 400 || error.statusCode === 403) {
        ws.close(1008, error.message);
        return;
    }

    ws.close(1011, 'Internal Server Error');
}

function rejectUpgrade(socket, statusCode, message) {
    socket.write(
        'HTTP/1.1 ' + statusCode + ' ' + message + '\r\n' +
        'Connection: close\r\n' +
        'Content-Length: 0\r\n' +
        '\r\n'
    );
    socket.destroy();
}

function isTlsAllowed(request, websocketConfig) {
    if (process.env.NODE_ENV !== 'production' || websocketConfig.requireTlsInProduction === false) {
        return true;
    }

    if (request.socket && request.socket.encrypted) {
        return true;
    }

    return request.headers['x-forwarded-proto'] === 'https';
}

function isOriginAllowed(origin) {
    if (!origin) {
        return true;
    }

    return !!(configuration.cors &&
        configuration.cors.allowedOrigins &&
        configuration.cors.allowedOrigins.indexOf(origin) !== -1);
}

function queryContainsDeviceKey(query) {
    return Object.keys(query || {}).some(function(key) {
        var normalizedKey = key.toLowerCase();
        return normalizedKey === 'devicekey' ||
            normalizedKey === 'requestmiatarudevicekey' ||
            normalizedKey === 'requestingdevicekey';
    });
}

function getWebSocketConfig() {
    var defaults = {
        maxMessageBytes: 16384,
        maxSubscriptionsPerSocket: 50,
        maxConnectionsPerIp: 20,
        heartbeatIntervalSeconds: 30,
        authTimeoutSeconds: 10,
        visitorRefreshIntervalSeconds: 60,
        maxBufferedBytes: 1048576,
        requireTlsInProduction: true
    };

    return Object.assign(defaults, configuration.websocket || {});
}

function getConnectionCount(ip) {
    return connectionCountsByIp[ip] || 0;
}

function incrementConnectionCount(ip) {
    connectionCountsByIp[ip] = getConnectionCount(ip) + 1;
}

function decrementConnectionCount(ip) {
    connectionCountsByIp[ip] = Math.max(0, getConnectionCount(ip) - 1);

    if (connectionCountsByIp[ip] === 0) {
        delete connectionCountsByIp[ip];
    }
}

function uniqueDeviceIds(deviceIds) {
    var seen = {};
    var result = [];

    deviceIds.forEach(function(deviceId) {
        if (seen[deviceId]) {
            return;
        }

        seen[deviceId] = true;
        result.push(deviceId);
    });

    return result;
}

module.exports = {
    install: install,
    _getConnectionCount: getConnectionCount
};
