'use strict';

async function postMiataru(baseUrl, path, payload, fetchImpl) {
    fetchImpl = fetchImpl || global.fetch;

    if (typeof fetchImpl !== 'function') {
        throw new Error('No fetch implementation available. Node.js 20 or newer is required.');
    }

    var response = await fetchImpl(buildUrl(baseUrl, path), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    var body = null;
    var text = await response.text();

    if (text) {
        try {
            body = JSON.parse(text);
        } catch (error) {
            body = { rawBody: text };
        }
    }

    return {
        ok: response.ok,
        status: response.status,
        body: body
    };
}

async function verifyOrSetDeviceKey(config, options) {
    options = options || {};

    var fetchImpl = options.fetch;
    var logger = options.logger || console;

    var verifyResult = await verifyDeviceKey(config, fetchImpl);
    if (verifyResult.ok) {
        return { verified: true, setupPerformed: false };
    }

    if (verifyResult.status !== 403) {
        throw new Error('Could not verify bridge DeviceKey: HTTP ' + verifyResult.status);
    }

    logger.warn('Bridge DeviceKey could not be verified; trying first-time DeviceKey setup.');
    var setupResult = await postMiataru(config.miataru.baseUrl, '/v1/setDeviceKey', {
        MiataruSetDeviceKey: {
            DeviceID: config.miataru.deviceId,
            CurrentDeviceKey: null,
            NewDeviceKey: config.miataru.deviceKey
        }
    }, fetchImpl);

    if (!setupResult.ok) {
        throw new Error('Could not set configured bridge DeviceKey. The device may already have a different key. HTTP ' + setupResult.status);
    }

    var secondVerifyResult = await verifyDeviceKey(config, fetchImpl);
    if (!secondVerifyResult.ok) {
        throw new Error('Configured bridge DeviceKey was set but verification still failed. HTTP ' + secondVerifyResult.status);
    }

    return { verified: true, setupPerformed: true };
}

async function setSloganBestEffort(config, options) {
    options = options || {};

    var logger = options.logger || console;

    try {
        var result = await postMiataru(config.miataru.baseUrl, '/v1/setDeviceSlogan', {
            MiataruSetDeviceSlogan: {
                DeviceID: config.miataru.deviceId,
                DeviceKey: config.miataru.deviceKey,
                Slogan: config.miataru.slogan
            }
        }, options.fetch);

        if (!result.ok) {
            logger.warn('Could not set bridge slogan; continuing. HTTP ' + result.status);
            return false;
        }

        return true;
    } catch (error) {
        logger.warn('Could not set bridge slogan; continuing. ' + error.message);
        return false;
    }
}

function verifyDeviceKey(config, fetchImpl) {
    return postMiataru(config.miataru.baseUrl, '/v1/getDeviceSecurityStatus', {
        MiataruGetDeviceSecurityStatus: {
            DeviceID: config.miataru.deviceId,
            RequestDeviceID: config.miataru.deviceId,
            RequestDeviceKey: config.miataru.deviceKey
        }
    }, fetchImpl);
}

function buildUrl(baseUrl, path) {
    return baseUrl.replace(/\/+$/, '') + path;
}

module.exports = {
    postMiataru: postMiataru,
    verifyOrSetDeviceKey: verifyOrSetDeviceKey,
    setSloganBestEffort: setSloganBestEffort
};
