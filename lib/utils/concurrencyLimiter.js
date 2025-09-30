'use strict';

// Helper to build consistent error instances that carry limiter-specific codes.
function createLimiterError(code, message) {
    var error = new Error(message || 'Concurrency limiter error');
    error.code = code;
    return error;
}

// Basic in-memory limiter that tracks concurrency per-key with optional queueing.
function ConcurrencyLimiter(options) {
    options = options || {};

    this.maxConcurrent = typeof options.maxConcurrent === 'number' && options.maxConcurrent >= 0 ? options.maxConcurrent : 1;
    this.maxQueue = typeof options.maxQueue === 'number' && options.maxQueue >= 0 ? options.maxQueue : Infinity;
    this.queueTimeoutMs = typeof options.queueTimeoutMs === 'number' && options.queueTimeoutMs > 0 ? options.queueTimeoutMs : 0;

    this._state = new Map();
}

ConcurrencyLimiter.ERROR_CODES = {
    QUEUE_FULL: 'QUEUE_FULL',
    QUEUE_TIMEOUT: 'QUEUE_TIMEOUT'
};

ConcurrencyLimiter.prototype.acquire = function(key) {
    key = key || '__default__';

    var entry = this._state.get(key);

    if (!entry) {
        entry = { active: 0, queue: [] };
        this._state.set(key, entry);
    }

    // Grant the slot immediately when we are below the per-key concurrency cap.
    if (entry.active < this.maxConcurrent) {
        entry.active += 1;
        return Promise.resolve(this._createRelease(key));
    }

    // Reject once the queue has reached the configured upper bound.
    if (entry.queue.length >= this.maxQueue) {
        return Promise.reject(createLimiterError(ConcurrencyLimiter.ERROR_CODES.QUEUE_FULL, 'Concurrency queue is full'));
    }

    var self = this;

    return new Promise(function(resolve, reject) {
        var queueItem = {
            resolve: function() {
                resolve(self._createRelease(key));
            },
            reject: reject
        };

        if (self.queueTimeoutMs > 0) {
            queueItem.timer = setTimeout(function() {
                self._removeQueueItem(key, queueItem);
                reject(createLimiterError(ConcurrencyLimiter.ERROR_CODES.QUEUE_TIMEOUT, 'Concurrency queue wait timed out'));
            }, self.queueTimeoutMs);
        }

        entry.queue.push(queueItem);
    });
};

ConcurrencyLimiter.prototype.schedule = function(task, key) {
    var self = this;

    return this.acquire(key).then(function(release) {
        var taskResult;

        try {
            taskResult = task();
        } catch (taskError) {
            release();
            return Promise.reject(taskError);
        }

        return Promise.resolve(taskResult)
            .then(function(result) {
                release();
                return result;
            }, function(error) {
                release();
                return Promise.reject(error);
            });
    });
};

// Build an idempotent release callback that unlocks the slot at most once.
ConcurrencyLimiter.prototype._createRelease = function(key) {
    var self = this;
    var released = false;

    return function release() {
        if (released) {
            return;
        }

        released = true;
        self._release(key);
    };
};

ConcurrencyLimiter.prototype._release = function(key) {
    var entry = this._state.get(key);

    if (!entry) {
        return;
    }

    if (entry.active > 0) {
        entry.active -= 1;
    }

    if (entry.queue.length > 0 && entry.active < this.maxConcurrent) {
        var nextItem = entry.queue.shift();

        if (nextItem.timer) {
            clearTimeout(nextItem.timer);
        }

        entry.active += 1;
        nextItem.resolve();
        return;
    }

    // Clean up empty entries so the internal map does not grow unbounded.
    if (entry.active === 0 && entry.queue.length === 0) {
        this._state.delete(key);
    }
};

// Remove a queued waiter (typically when it timed out) and tidy up tracking state.
ConcurrencyLimiter.prototype._removeQueueItem = function(key, item) {
    var entry = this._state.get(key);

    if (!entry) {
        return;
    }

    var index = entry.queue.indexOf(item);

    if (index !== -1) {
        entry.queue.splice(index, 1);
    }

    if (entry.active === 0 && entry.queue.length === 0) {
        this._state.delete(key);
    }
};

module.exports = {
    ConcurrencyLimiter: ConcurrencyLimiter,
    createLimiterError: createLimiterError
};
