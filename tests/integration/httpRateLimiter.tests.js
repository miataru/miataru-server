'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');

var configuration = require('../../lib/configuration');
var rateLimiter = require('../../lib/middlewares/rateLimiter');

describe('HTTP rate limiter middleware', function() {
    var configurationSnapshot;

    beforeEach(function() {
        configurationSnapshot = snapshotConfiguration();
    });

    afterEach(function() {
        restoreConfiguration(configurationSnapshot);
    });

    // Baseline check that disabling the middleware restores unrestricted throughput.
    it('does not throttle requests when disabled', async function() {
        var appContext = buildApp({
            enabled: false
        });

        var agent = request(appContext.app);

        var first = startRequest(agent, 200);
        await waitForPendingLength(appContext.pending, 1);

        var second = startRequest(agent, 200);
        await waitForPendingLength(appContext.pending, 2);

        var third = startRequest(agent, 200);
        await waitForPendingLength(appContext.pending, 3);

        appContext.releaseNext();
        appContext.releaseNext();
        appContext.releaseNext();

        var responses = await Promise.all([first, second, third]);

        responses.forEach(function(res) {
            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal({ ok: true });
        });
    });

    // Exercises the happy path plus overflow rejection when the queue is exhausted.
    it('queues up to the configured limit and rejects overflow requests', async function() {
        var appContext = buildApp({
            enabled: true,
            maxConcurrentPerIp: 1,
            maxQueuePerIp: 1,
            queueTimeoutMs: 100,
            rejectionMessage: 'Rate limit exceeded'
        });

        var agent = request(appContext.app);

        var first = startRequest(agent, 200);
        await waitForPendingLength(appContext.pending, 1);

        var second = startRequest(agent, 200);

        // Give the queued request a moment to remain pending without reaching the handler
        await delay(20);
        expect(appContext.pending.length).to.equal(1);

        var thirdResponse = await startRequest(agent, 429);
        expect(thirdResponse.status).to.equal(429);
        expect(thirdResponse.body).to.deep.equal({ error: 'Rate limit exceeded' });

        appContext.releaseNext();
        var firstResponse = await first;
        expect(firstResponse.status).to.equal(200);

        await waitForPendingLength(appContext.pending, 1);

        appContext.releaseNext();
        var secondResponse = await second;
        expect(secondResponse.status).to.equal(200);
    });

    // Validates queued requests receive the timeout response after waiting past the limit.
    it('returns the timeout message when queued requests wait too long', async function() {
        var appContext = buildApp({
            enabled: true,
            maxConcurrentPerIp: 1,
            maxQueuePerIp: 1,
            queueTimeoutMs: 30,
            rejectionMessage: 'Rate limit exceeded',
            timeoutMessage: 'Queue wait timed out'
        });

        var agent = request(appContext.app);

        var first = startRequest(agent, 200);
        await waitForPendingLength(appContext.pending, 1);

        var timedOutResponse = await startRequest(agent, 429);
        expect(timedOutResponse.status).to.equal(429);
        expect(timedOutResponse.body).to.deep.equal({ error: 'Queue wait timed out' });

        appContext.releaseNext();
        var firstResponse = await first;
        expect(firstResponse.status).to.equal(200);
    });
});

function buildApp(overrides) {
    configuration.rateLimiting = configuration.rateLimiting || {};
    configuration.rateLimiting.http = Object.assign({}, overrides);

    var app = express();
    rateLimiter.install(app);

    var pending = [];

    app.get('/slow', function(req, res) {
        pending.push(res);
    });

    return {
        app: app,
        pending: pending,
        releaseNext: function(status, body) {
            if (!pending.length) {
                throw new Error('no pending responses to release');
            }

            var res = pending.shift();
            res.status(status || 200).json(body || { ok: true });
        }
    };
}

function waitForPendingLength(pending, expectedLength, timeoutMs) {
    return waitForCondition(function() {
        return pending.length === expectedLength;
    }, timeoutMs);
}

function waitForCondition(checkFn, timeoutMs) {
    var startTime = Date.now();
    var limit = timeoutMs || 1000;

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

function startRequest(agent, expectedStatus) {
    return new Promise(function(resolve, reject) {
        agent
            .get('/slow')
            .end(function(err, res) {
                if (err) {
                    reject(err);
                    return;
                }

                if (typeof expectedStatus === 'number') {
                    try {
                        expect(res.status).to.equal(expectedStatus);
                    } catch (assertionError) {
                        reject(assertionError);
                        return;
                    }
                }

                resolve(res);
            });
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
