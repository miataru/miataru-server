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
    if (isVerifiedDeviceKeyResult(verifyResult)) {
        logger.info('Bridge DeviceKey verified for device ' + config.miataru.deviceId + '.');
        return { verified: true, setupPerformed: false };
    }

    if (verifyResult.status !== 403) {
        throw new Error('Could not verify bridge DeviceKey: ' + describeHttpResult(verifyResult));
    }

    logger.warn('Bridge DeviceKey could not be verified (' + describeHttpResult(verifyResult) + '); trying first-time DeviceKey setup for device ' + config.miataru.deviceId + '.');
    var setupResult = await postMiataru(config.miataru.baseUrl, '/v1/setDeviceKey', {
        MiataruSetDeviceKey: {
            DeviceID: config.miataru.deviceId,
            CurrentDeviceKey: null,
            NewDeviceKey: config.miataru.deviceKey
        }
    }, fetchImpl);

    if (!setupResult.ok) {
        throw new Error('Could not set configured bridge DeviceKey. The device may already have a different key. ' + describeHttpResult(setupResult));
    }

    logger.info('Configured bridge DeviceKey was accepted by /v1/setDeviceKey; verifying it now.');

    var secondVerifyResult = await verifyDeviceKey(config, fetchImpl);
    if (!isVerifiedDeviceKeyResult(secondVerifyResult)) {
        throw new Error('Configured bridge DeviceKey was set but verification still failed. ' + describeHttpResult(secondVerifyResult));
    }

    logger.info('Bridge DeviceKey setup and verification succeeded for device ' + config.miataru.deviceId + '.');

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
            logger.warn('Could not set bridge slogan; continuing. ' + describeHttpResult(result));
            return false;
        }

        logger.info('Bridge slogan set for device ' + config.miataru.deviceId + '.');
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

function isVerifiedDeviceKeyResult(result) {
    if (!result || !result.ok) {
        return false;
    }

    return !!(result.body &&
        result.body.MiataruDeviceSecurityStatus &&
        result.body.MiataruDeviceSecurityStatus.HasDeviceKey === true);
}

function describeHttpResult(result) {
    if (!result) {
        return 'no HTTP response';
    }

    var message = 'HTTP ' + result.status;
    var errorMessage = result.body && result.body.error;

    if (errorMessage) {
        message += ' - ' + errorMessage;
    }

    return message;
}

module.exports = {
    postMiataru: postMiataru,
    verifyOrSetDeviceKey: verifyOrSetDeviceKey,
    setSloganBestEffort: setSloganBestEffort,
    _isVerifiedDeviceKeyResult: isVerifiedDeviceKeyResult,
    _describeHttpResult: describeHttpResult
};
