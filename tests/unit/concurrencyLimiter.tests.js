'use strict';

var expect = require('chai').expect;

var limiterModule = require('../../lib/utils/concurrencyLimiter');
var ConcurrencyLimiter = limiterModule.ConcurrencyLimiter;
var limiterErrors = ConcurrencyLimiter.ERROR_CODES;

describe('ConcurrencyLimiter', function() {

    // Validates that the limiter caps concurrency and rejects once the queue overflows.
    it('enforces maxConcurrent and maxQueue per key', async function() {
        var limiter = new ConcurrencyLimiter({ maxConcurrent: 1, maxQueue: 1 });

        var activeRelease = await limiter.acquire('test');
        var queuedAcquire = limiter.acquire('test');
        var overflowError = null;

        try {
            await limiter.acquire('test');
        } catch (err) {
            overflowError = err;
        }

        expect(overflowError).to.be.an('error');
        expect(overflowError.code).to.equal(limiterErrors.QUEUE_FULL);

        activeRelease();

        var queuedRelease = await queuedAcquire;
        expect(queuedRelease).to.be.a('function');
        queuedRelease();
    });

    // Ensures queued callers receive the timeout error when they wait too long.
    it('rejects queued acquires when the timeout elapses', async function() {
        var limiter = new ConcurrencyLimiter({ maxConcurrent: 1, maxQueue: 1, queueTimeoutMs: 25 });

        var activeRelease = await limiter.acquire('timeout-test');
        var timeoutError = null;

        try {
            await limiter.acquire('timeout-test');
        } catch (err) {
            timeoutError = err;
        }

        expect(timeoutError).to.be.an('error');
        expect(timeoutError.code).to.equal(limiterErrors.QUEUE_TIMEOUT);

        activeRelease();
    });

    // Confirms async rejections still release the slot granted by schedule().
    it('releases slots when scheduled tasks reject asynchronously', async function() {
        var limiter = new ConcurrencyLimiter({ maxConcurrent: 1, maxQueue: 0 });
        var asyncError = null;

        try {
            await limiter.schedule(function() {
                return Promise.reject(new Error('boom'));
            }, 'schedule-test');
        } catch (err) {
            asyncError = err;
        }

        expect(asyncError).to.be.an('error');
        expect(asyncError.message).to.equal('boom');

        var release = await limiter.acquire('schedule-test');
        release();
    });

    // Confirms synchronous throws also release the slot to avoid deadlock.
    it('releases slots when scheduled tasks throw synchronously', async function() {
        var limiter = new ConcurrencyLimiter({ maxConcurrent: 1, maxQueue: 0 });
        var syncError = null;

        try {
            await limiter.schedule(function() {
                throw new Error('sync boom');
            }, 'schedule-sync');
        } catch (err) {
            syncError = err;
        }

        expect(syncError).to.be.an('error');
        expect(syncError.message).to.equal('sync boom');

        var release = await limiter.acquire('schedule-sync');
        release();
    });
});
