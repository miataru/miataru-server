var WebSocket = require('ws');

var allowedDevicesUtils = require('../utils/allowedDevices');
var logger = require('../logger');

var sessionsByDevice = {};

function subscribe(session, deviceId) {
    if (!sessionsByDevice[deviceId]) {
        sessionsByDevice[deviceId] = new Set();
    }

    sessionsByDevice[deviceId].add(session);
    session.subscriptions.add(deviceId);
}

function replaceSubscriptions(session, deviceIds) {
    unsubscribeAll(session);

    deviceIds.forEach(function(deviceId) {
        subscribe(session, deviceId);
    });
}

function unsubscribeAll(session) {
    if (!session || !session.subscriptions) {
        return;
    }

    Array.from(session.subscriptions).forEach(function(deviceId) {
        unsubscribe(session, deviceId);
    });
}

function unsubscribe(session, deviceId) {
    var sessions = sessionsByDevice[deviceId];

    if (sessions) {
        sessions.delete(session);

        if (sessions.size === 0) {
            delete sessionsByDevice[deviceId];
        }
    }

    session.subscriptions.delete(deviceId);
}

function publishLocation(locationData, callback) {
    publishOneLocation(locationData, callback || function() {});
}

function publishLocations(locations, callback) {
    locations = Array.isArray(locations) ? locations : [];
    callback = callback || function() {};

    var index = 0;

    function publishNext() {
        if (index >= locations.length) {
            callback();
            return;
        }

        var locationData = locations[index];
        index += 1;
        publishOneLocation(locationData, publishNext);
    }

    publishNext();
}

function publishOneLocation(locationData, callback) {
    if (!locationData || !locationData.Device) {
        callback();
        return;
    }

    var deviceId = locationData.Device;
    var sessions = sessionsByDevice[deviceId];

    if (!sessions || sessions.size === 0) {
        callback();
        return;
    }

    var sessionList = Array.from(sessions);
    var pending = sessionList.length;

    sessionList.forEach(function(session) {
        deliverIfAuthorized(session, deviceId, locationData, function() {
            pending -= 1;

            if (pending === 0) {
                callback();
            }
        });
    });
}

function deliverIfAuthorized(session, deviceId, locationData, callback) {
    if (!session || !session.socket || session.socket.readyState !== WebSocket.OPEN) {
        unsubscribe(session, deviceId);
        callback();
        return;
    }

    allowedDevicesUtils.checkAccess(
        deviceId,
        session.requestingDeviceId,
        allowedDevicesUtils.ACCESS_TYPE_CURRENT_LOCATION,
        function(error, hasAccess) {
            if (error) {
                logger.warn('WebSocket location access check failed for device %s: %s', deviceId, error.message);
                callback();
                return;
            }

            if (!hasAccess) {
                unsubscribe(session, deviceId);
                callback();
                return;
            }

            sendLocation(session, locationData);
            callback();
        }
    );
}

function sendLocation(session, locationData) {
    var socket = session.socket;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    if (socket.bufferedAmount > session.maxBufferedBytes) {
        socket.close(1008, 'Client is too slow');
        return;
    }

    socket.send(JSON.stringify(locationData), function(error) {
        if (error) {
            logger.warn('WebSocket location send failed: %s', error.message);
        }
    });
}

module.exports = {
    publishLocation: publishLocation,
    publishLocations: publishLocations,
    replaceSubscriptions: replaceSubscriptions,
    unsubscribeAll: unsubscribeAll,
    _sessionsByDevice: sessionsByDevice
};
