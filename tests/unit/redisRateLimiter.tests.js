'use strict';

var expect = require('chai').expect;

var configuration = require('../../lib/configuration');

var redisModulePath = require.resolve('../../lib/db');

describe('installRedisRateLimiter', function() {
    var configurationSnapshot;

    beforeEach(function() {
        configurationSnapshot = snapshotConfiguration();
    });

    afterEach(function() {
        restoreConfiguration(configurationSnapshot);
        delete require.cache[redisModulePath];
    });

    // Verifies queued Redis calls drain in order and overflow requests error out.
    it('queues operations and rejects when the queue is full', async function() {
        configuration.rateLimiting = configuration.rateLimiting || {};
        configuration.rateLimiting.redis = {
            enabled: true,
            maxConcurrent: 1,
            maxQueue: 1,
            queueTimeoutMs: 0
        };

        delete require.cache[redisModulePath];
        var db = require('../../lib/db');
        var client = createStubClient();

        db.installRedisRateLimiter(client);

        var firstPromise = client.get('first');
        await waitForCondition(function() {
            return client.pendingCount() === 1;
        }, 100);

        var secondPromise = client.get('second');
        await delay(10);
        expect(client.pendingCount()).to.equal(1);

        var overflowError = null;

        try {
            await client.get('third');
        } catch (err) {
            overflowError = err;
        }

        expect(overflowError).to.be.an('error');
        expect(overflowError.code).to.equal('REDIS_QUEUE_FULL');

        client.resolveNext('first-result');
        var firstResult = await firstPromise;
        expect(firstResult).to.equal('first-result');

        await waitForCondition(function() {
            return client.pendingCount() === 1;
        }, 100);

        client.resolveNext('second-result');
        var secondResult = await secondPromise;
        expect(secondResult).to.equal('second-result');
    });

    // Checks that queue timeouts become Redis specific error codes and messages.
    it('translates queue timeouts into Redis specific errors', async function() {
        configuration.rateLimiting = configuration.rateLimiting || {};
        configuration.rateLimiting.redis = {
            enabled: true,
            maxConcurrent: 1,
            maxQueue: 1,
            queueTimeoutMs: 25
        };

        delete require.cache[redisModulePath];
        var db = require('../../lib/db');
        var client = createStubClient();

        db.installRedisRateLimiter(client);

        var firstPromise = client.get('alpha');
        await waitForCondition(function() {
            return client.pendingCount() === 1;
        }, 100);

        var timeoutError = null;

        try {
            await client.get('beta');
        } catch (err) {
            timeoutError = err;
        }

        expect(timeoutError).to.be.an('error');
        expect(timeoutError.code).to.equal('REDIS_QUEUE_TIMEOUT');
        expect(client.pendingCount()).to.equal(1);

        client.resolveNext('alpha-result');
        var firstResult = await firstPromise;
        expect(firstResult).to.equal('alpha-result');
    });

    // Confirms rate limiting is a no-op when the feature is disabled in config.
    it('leaves client methods untouched when disabled', function() {
        configuration.rateLimiting = configuration.rateLimiting || {};
        configuration.rateLimiting.redis = {
            enabled: false
        };

        delete require.cache[redisModulePath];
        var db = require('../../lib/db');
        var client = createStubClient();
        var originalGet = client.get;

        db.installRedisRateLimiter(client);

        expect(client.get).to.equal(originalGet);
    });
});

function createStubClient() {
    var pending = [];

    function invoke() {
        var slot = {};

        slot.promise = new Promise(function(resolve, reject) {
            slot.resolve = resolve;
            slot.reject = reject;
        });

        pending.push(slot);
        return slot.promise;
    }

    var client = {
        get: function() {
            return invoke();
        }
    };

    client.pendingCount = function() {
        return pending.length;
    };

    client.resolveNext = function(value) {
        if (!pending.length) {
            throw new Error('no pending operations to resolve');
        }

        var next = pending.shift();
        next.resolve(value);
    };

    return client;
}

function waitForCondition(checkFn, timeoutMs) {
    var startTime = Date.now();
    var limit = timeoutMs || 200;

    return new Promise(function(resolve, reject) {
        function poll() {
            if (checkFn()) {
                resolve();
                return;
            }

            if ((Date.now() - startTime) >= limit) {
                reject(new Error('Timed out waiting for condition'));
                return;
            }

            setTimeout(poll, 5);
        }

        poll();
    });
}

function delay(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

function snapshotConfiguration() {
    return JSON.parse(JSON.stringify(configuration));
}

function restoreConfiguration(snapshot) {
    Object.keys(configuration).forEach(function(key) {
        delete configuration[key];
    });

    if (snapshot) {
        Object.assign(configuration, JSON.parse(JSON.stringify(snapshot)));
    }
}
