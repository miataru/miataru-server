'use strict';

function normalizeTopicPrefix(prefix) {
    if (typeof prefix !== 'string' || prefix.trim() === '') {
        throw new Error('mqtt.topicPrefix must be a non-empty string');
    }

    var normalized = prefix.trim().replace(/^\/+/, '').replace(/\/+$/, '');

    if (normalized === '') {
        throw new Error('mqtt.topicPrefix must contain at least one non-slash character');
    }

    return normalized;
}

function sanitizeDeviceIdForTopic(deviceId) {
    return String(deviceId).replace(/[\/+#\u0000]/g, '-');
}

function buildLocationTopic(topicPrefix, deviceId) {
    return normalizeTopicPrefix(topicPrefix) + '/' + sanitizeDeviceIdForTopic(deviceId) + '/location';
}

module.exports = {
    normalizeTopicPrefix: normalizeTopicPrefix,
    sanitizeDeviceIdForTopic: sanitizeDeviceIdForTopic,
    buildLocationTopic: buildLocationTopic
};
