'use strict';

var http = require('http');
var expect = require('chai').expect;
var request = require('supertest');
var WebSocket = require('ws');

var app = require('../../server');
var calls = require('../testFiles/calls');
var configuration = require('../../lib/configuration');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var allowedDevicesUtils = require('../../lib/utils/allowedDevices');
var deviceKeyUtils = require('../../lib/utils/deviceKey');

describe('WebSocket location subscriptions', function() {
    this.timeout(5000);

    var server;
    var wsUrl;
    var clients;
    var configurationSnapshot;
    var testIndex = 0;

    beforeEach(function(done) {
        configurationSnapshot = snapshotConfiguration();
        configuration.websocket = Object.assign({}, configuration.websocket, {
            maxMessageBytes: 512,
            maxSubscriptionsPerSocket: 3,
            maxConnectionsPerIp: 20,
            heartbeatIntervalSeconds: 30,
            authTimeoutSeconds: 1,
            visitorRefreshIntervalSeconds: 0.05
        });

        clients = [];
        server = http.createServer(app);
        app.installWebSocket(server);
        server.listen(0, '127.0.0.1', function() {
            wsUrl = 'ws://127.0.0.1:' + server.address().port + '/v1/ws/location';
            done();
        });
    });

    afterEach(async function() {
        clients.forEach(function(client) {
            if (client.ws.readyState === WebSocket.OPEN || client.ws.readyState === WebSocket.CONNECTING) {
                client.ws.terminate();
            }
        });

        await closeServer(server);
        restoreConfiguration(configurationSnapshot);
    });

    it('subscribes to multiple devices and returns null-style results for denied targets', async function() {
        var ids = nextIds('multi');

        await cleanupDevices([ids.targetA, ids.targetB, ids.requester, ids.other]);
        await updateLocation(ids.targetA, '1000');
        await updateLocation(ids.targetB, '2000');
        await setAllowedDevices(ids.targetB, [
            {
                DeviceID: ids.other,
                hasCurrentLocationAccess: true,
                hasHistoryAccess: false
            }
        ]);

        var client = await connectClient();
        client.send(subscribePayload(ids.requester, [ids.targetA, ids.targetB]));

        var subscription = await client.nextJson();
        expect(subscription.type).to.equal('subscription');
        expect(subscription.MiataruLocation).to.have.length(2);
        expect(subscription.MiataruLocation[0].Device).to.equal(ids.targetA);
        expect(subscription.MiataruLocation[1]).to.equal(null);

        await updateLocation(ids.targetA, '3000');
        var update = await client.nextJson();
        expect(update.Device).to.equal(ids.targetA);
        expect(update.Timestamp).to.equal('3000');

        await updateLocation(ids.targetB, '4000');
        await client.expectNoJson(100);
    });

    it('matches GetLocation strict RequestMiataruDeviceKey behavior', async function() {
        var ids = nextIds('strict');

        await cleanupDevices([ids.targetA, ids.requester]);
        await updateLocation(ids.targetA, '1000');
        await setDeviceKey(ids.requester, 'requester-secret');

        var missingKeyClient = await connectClient();
        missingKeyClient.send(subscribePayload(ids.requester, [ids.targetA]));
        var closeInfo = await missingKeyClient.nextClose();
        expect(closeInfo.code).to.equal(1008);

        var matchingKeyClient = await connectClient();
        matchingKeyClient.send(subscribePayload(ids.requester, [ids.targetA], 'requester-secret'));
        var subscription = await matchingKeyClient.nextJson();
        expect(subscription.type).to.equal('subscription');
        expect(subscription.MiataruLocation[0].Device).to.equal(ids.targetA);
    });

    it('stops pushes after ACL revocation and allows a later resubscribe after grant', async function() {
        var ids = nextIds('acl');

        await cleanupDevices([ids.targetA, ids.requester, ids.other]);
        await updateLocation(ids.targetA, '1000');
        await setAllowedDevices(ids.targetA, [
            {
                DeviceID: ids.requester,
                hasCurrentLocationAccess: true,
                hasHistoryAccess: false
            }
        ]);

        var client = await connectClient();
        client.send(subscribePayload(ids.requester, [ids.targetA]));
        await client.nextJson();

        await setAllowedDevices(ids.targetA, [
            {
                DeviceID: ids.other,
                hasCurrentLocationAccess: true,
                hasHistoryAccess: false
            }
        ]);
        await updateLocation(ids.targetA, '2000');
        await client.expectNoJson(100);

        await setAllowedDevices(ids.targetA, [
            {
                DeviceID: ids.requester,
                hasCurrentLocationAccess: true,
                hasHistoryAccess: false
            }
        ]);
        client.send(subscribePayload(ids.requester, [ids.targetA]));
        var subscription = await client.nextJson();
        expect(subscription.MiataruLocation[0].Device).to.equal(ids.targetA);

        await updateLocation(ids.targetA, '3000');
        var update = await client.nextJson();
        expect(update.Device).to.equal(ids.targetA);
        expect(update.Timestamp).to.equal('3000');
    });

    it('streams every bulk update point in request order with original timestamps', async function() {
        var ids = nextIds('bulk');

        await cleanupDevices([ids.targetA, ids.requester]);

        var client = await connectClient();
        client.send(subscribePayload(ids.requester, [ids.targetA]));
        var subscription = await client.nextJson();
        expect(subscription.MiataruLocation[0]).to.equal(null);

        await updateBulk(ids.targetA, ['1000', '2000', '3000'], true);
        var first = await client.nextJson();
        var second = await client.nextJson();
        var third = await client.nextJson();
        expect([first.Timestamp, second.Timestamp, third.Timestamp]).to.deep.equal(['1000', '2000', '3000']);

        await updateBulk(ids.targetA, ['4000', '5000', '6000'], false);
        var fourth = await client.nextJson();
        var fifth = await client.nextJson();
        var sixth = await client.nextJson();
        expect([fourth.Timestamp, fifth.Timestamp, sixth.Timestamp]).to.deep.equal(['4000', '5000', '6000']);
    });

    it('keeps visitor history timestamp fresh while subscribed', async function() {
        var ids = nextIds('visitor');

        await cleanupDevices([ids.targetA, ids.requester]);
        await updateLocation(ids.targetA, '1000');

        var client = await connectClient();
        client.send(subscribePayload(ids.requester, [ids.targetA]));
        await client.nextJson();

        var initialVisitor = await waitForVisitor(ids.targetA, ids.requester);
        var initialTimestamp = initialVisitor.TimeStamp;

        await waitForCondition(async function() {
            var visitor = await getVisitor(ids.targetA, ids.requester);
            return visitor && visitor.TimeStamp > initialTimestamp;
        }, 1000);
    });

    it('rejects malformed, oversized, and over-limit subscription messages safely', async function() {
        var ids = nextIds('invalid');

        var malformedClient = await connectClient();
        malformedClient.ws.send('{');
        expect((await malformedClient.nextClose()).code).to.equal(1008);

        var oversizedClient = await connectClient();
        oversizedClient.ws.send(JSON.stringify({
            type: 'subscribe',
            filler: new Array(700).join('x')
        }));
        expect((await oversizedClient.nextClose()).code).to.equal(1009);

        var tooManyClient = await connectClient();
        tooManyClient.send(subscribePayload(ids.requester, [ids.targetA, ids.targetB, ids.other, 'extra-target']));
        expect((await tooManyClient.nextClose()).code).to.equal(1008);
    });

    it('rejects disallowed browser origins during upgrade', async function() {
        try {
            await connectClient({ headers: { Origin: 'https://not-allowed.example' } });
            throw new Error('connection unexpectedly succeeded');
        } catch (error) {
            expect(error.message).to.include('Unexpected server response: 403');
        }
    });

    function connectClient(options) {
        options = options || {};

        return new Promise(function(resolve, reject) {
            var ws = new WebSocket(wsUrl, options);
            var client = createClient(ws);
            var settled = false;

            ws.once('open', function() {
                settled = true;
                clients.push(client);
                resolve(client);
            });

            ws.once('error', function(error) {
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            });
        });
    }

    function createClient(ws) {
        var messages = [];
        var messageWaiters = [];
        var closeInfo = null;
        var closeWaiters = [];

        ws.on('message', function(message) {
            var parsed = JSON.parse(message.toString());
            var waiter = messageWaiters.shift();

            if (waiter) {
                waiter.resolve(parsed);
                return;
            }

            messages.push(parsed);
        });

        ws.on('close', function(code, reason) {
            closeInfo = {
                code: code,
                reason: reason.toString()
            };

            closeWaiters.splice(0).forEach(function(waiter) {
                waiter.resolve(closeInfo);
            });
        });

        return {
            ws: ws,
            send: function(payload) {
                ws.send(JSON.stringify(payload));
            },
            nextJson: function(timeoutMs) {
                if (messages.length > 0) {
                    return Promise.resolve(messages.shift());
                }

                return waitForQueue(messageWaiters, timeoutMs || 1000);
            },
            nextClose: function(timeoutMs) {
                if (closeInfo) {
                    return Promise.resolve(closeInfo);
                }

                return waitForQueue(closeWaiters, timeoutMs || 1000);
            },
            expectNoJson: function(timeoutMs) {
                if (messages.length > 0) {
                    return Promise.reject(new Error('Unexpected WebSocket message: ' + JSON.stringify(messages.shift())));
                }

                return new Promise(function(resolve, reject) {
                    var timer = setTimeout(function() {
                        removeWaiter(messageWaiters, waiter);
                        resolve();
                    }, timeoutMs || 100);
                    var waiter = {
                        resolve: function(message) {
                            clearTimeout(timer);
                            reject(new Error('Unexpected WebSocket message: ' + JSON.stringify(message)));
                        },
                        reject: reject
                    };

                    messageWaiters.push(waiter);
                });
            }
        };
    }

    function waitForQueue(waiters, timeoutMs) {
        return new Promise(function(resolve, reject) {
            var timer = setTimeout(function() {
                removeWaiter(waiters, waiter);
                reject(new Error('Timed out waiting for WebSocket event'));
            }, timeoutMs);
            var waiter = {
                resolve: function(value) {
                    clearTimeout(timer);
                    resolve(value);
                },
                reject: reject
            };

            waiters.push(waiter);
        });
    }

    function removeWaiter(waiters, waiter) {
        var index = waiters.indexOf(waiter);

        if (index !== -1) {
            waiters.splice(index, 1);
        }
    }

    function subscribePayload(requesterId, targets, requesterKey) {
        var config = {
            RequestMiataruDeviceID: requesterId
        };

        if (requesterKey !== undefined) {
            config.RequestMiataruDeviceKey = requesterKey;
        }

        return {
            type: 'subscribe',
            MiataruConfig: config,
            MiataruGetLocation: targets.map(function(target) {
                return { Device: target };
            })
        };
    }

    function updateLocation(deviceId, timestamp) {
        return request(app)
            .post('/v1/UpdateLocation')
            .send(calls.locationUpdateCall({
                locations: calls.location({ device: deviceId, timeStamp: timestamp })
            }))
            .expect(200);
    }

    function updateBulk(deviceId, timestamps, historyEnabled) {
        return request(app)
            .post('/v1/UpdateLocation')
            .send(calls.locationUpdateCall({
                config: calls.config({ history: historyEnabled, retentionTime: 15 }),
                locations: timestamps.map(function(timestamp) {
                    return calls.location({ device: deviceId, timeStamp: timestamp });
                })
            }))
            .expect(200);
    }

    function setAllowedDevices(deviceId, allowedDevices) {
        return new Promise(function(resolve, reject) {
            allowedDevicesUtils.setAllowedDevices(deviceId, allowedDevices, function(error) {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    function setDeviceKey(deviceId, deviceKey) {
        return new Promise(function(resolve, reject) {
            deviceKeyUtils.setDeviceKey(deviceId, deviceKey, function(error) {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    function getVisitor(targetDeviceId, requesterId) {
        return request(app)
            .post('/v1/GetVisitorHistory')
            .send({
                MiataruGetVisitorHistory: {
                    Device: targetDeviceId,
                    Amount: '10'
                }
            })
            .expect(200)
            .then(function(res) {
                return res.body.MiataruVisitors.find(function(visitor) {
                    return visitor.DeviceID === requesterId;
                });
            });
    }

    function waitForVisitor(targetDeviceId, requesterId) {
        var foundVisitor;

        return waitForCondition(async function() {
            foundVisitor = await getVisitor(targetDeviceId, requesterId);
            return !!foundVisitor;
        }, 1000).then(function() {
            return foundVisitor;
        });
    }

    function waitForCondition(checkFn, timeoutMs) {
        var startTime = Date.now();

        return new Promise(function(resolve, reject) {
            function poll() {
                Promise.resolve()
                    .then(checkFn)
                    .then(function(result) {
                        if (result) {
                            resolve();
                            return;
                        }

                        if (Date.now() - startTime >= timeoutMs) {
                            reject(new Error('Timed out waiting for condition'));
                            return;
                        }

                        setTimeout(poll, 10);
                    })
                    .catch(reject);
            }

            poll();
        });
    }

    function cleanupDevices(deviceIds) {
        var keys = [];

        deviceIds.forEach(function(deviceId) {
            ['last', 'hist', 'visit', 'key', 'allowed', 'allowed:enabled', 'slogan'].forEach(function(suffix) {
                keys.push(kb.build(deviceId, suffix));
            });
        });

        return new Promise(function(resolve) {
            var remaining = keys.length;

            if (remaining === 0) {
                resolve();
                return;
            }

            keys.forEach(function(key) {
                db.del(key, function() {
                    remaining -= 1;

                    if (remaining === 0) {
                        resolve();
                    }
                });
            });
        });
    }

    function closeServer(serverToClose) {
        return new Promise(function(resolve, reject) {
            if (!serverToClose || !serverToClose.listening) {
                resolve();
                return;
            }

            serverToClose.close(function(error) {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    function nextIds(prefix) {
        testIndex += 1;
        var base = prefix + '-' + Date.now() + '-' + testIndex;

        return {
            targetA: base + '-target-a',
            targetB: base + '-target-b',
            requester: base + '-requester',
            other: base + '-other'
        };
    }

    function snapshotConfiguration() {
        return JSON.parse(JSON.stringify(configuration));
    }

    function restoreConfiguration(snapshot) {
        Object.keys(configuration).forEach(function(key) {
            delete configuration[key];
        });

        Object.assign(configuration, JSON.parse(JSON.stringify(snapshot)));
    }
});
