'use strict';

var EventEmitter = require('events');
var expect = require('chai').expect;

var configUtils = require('../../dev/websocket-mqtt-bridge/lib/config');
var topicUtils = require('../../dev/websocket-mqtt-bridge/lib/topic');
var miataruHttp = require('../../dev/websocket-mqtt-bridge/lib/miataruHttp');
var bridgeModule = require('../../dev/websocket-mqtt-bridge/lib/bridge');

describe('websocket MQTT bridge demo', function() {
    describe('config', function() {
        it('derives WebSocket URL from baseUrl and validates required fields', function() {
            var config = configUtils.normalizeConfig(baseConfig({
                miataru: {
                    webSocketUrl: undefined
                }
            }));

            expect(config.miataru.webSocketUrl).to.equal('wss://service.miataru.com/v1/ws/location');
            expect(config.mqtt.topicPrefix).to.equal('miataru');
        });

        it('rejects missing device key', function() {
            expect(function() {
                configUtils.normalizeConfig(baseConfig({
                    miataru: {
                        deviceKey: ''
                    }
                }));
            }).to.throw('miataru.deviceKey');
        });

        it('builds MQTT URLs from host and port', function() {
            var config = configUtils.normalizeConfig(baseConfig());
            expect(configUtils.buildMqttUrl(config.mqtt)).to.equal('mqtt://mqtt.example.com:1883');
        });
    });

    describe('topics', function() {
        it('normalizes prefix and replaces MQTT-critical characters in device IDs', function() {
            expect(topicUtils.normalizeTopicPrefix('/miataru/demo/')).to.equal('miataru/demo');
            expect(topicUtils.sanitizeDeviceIdForTopic('a/b+c#d\u0000e')).to.equal('a-b-c-d-e');
            expect(topicUtils.buildLocationTopic('/miataru/', 'a/b+c#d\u0000e')).to.equal('miataru/a-b-c-d-e/location');
        });
    });

    describe('device key bootstrap', function() {
        it('continues when the configured key verifies', async function() {
            var calls = [];
            var logs = captureLogger();
            var result = await miataruHttp.verifyOrSetDeviceKey(configUtils.normalizeConfig(baseConfig()), {
                fetch: fakeFetch(calls, [
                    fakeResponse(200, { MiataruDeviceSecurityStatus: { HasDeviceKey: true } })
                ]),
                logger: logs
            });

            expect(result).to.deep.equal({ verified: true, setupPerformed: false });
            expect(calls).to.have.length(1);
            expect(calls[0].url).to.equal('https://service.miataru.com/v1/getDeviceSecurityStatus');
            expect(logs.infos.join('\n')).to.include('Bridge DeviceKey verified');
        });

        it('sets the configured key when verification fails with 403 and then verifies again', async function() {
            var calls = [];
            var result = await miataruHttp.verifyOrSetDeviceKey(configUtils.normalizeConfig(baseConfig()), {
                fetch: fakeFetch(calls, [
                    fakeResponse(403, { error: 'Forbidden' }),
                    fakeResponse(200, { MiataruResponse: 'ACK' }),
                    fakeResponse(200, { MiataruDeviceSecurityStatus: { HasDeviceKey: true } })
                ]),
                logger: silentLogger()
            });

            expect(result).to.deep.equal({ verified: true, setupPerformed: true });
            expect(calls).to.have.length(3);
            expect(calls[1].url).to.equal('https://service.miataru.com/v1/setDeviceKey');
            expect(JSON.parse(calls[1].options.body).MiataruSetDeviceKey.CurrentDeviceKey).to.equal(null);
        });

        it('fails when verification returns 200 but the bridge key is still inactive', async function() {
            var calls = [];

            try {
                await miataruHttp.verifyOrSetDeviceKey(configUtils.normalizeConfig(baseConfig()), {
                    fetch: fakeFetch(calls, [
                        fakeResponse(200, { MiataruDeviceSecurityStatus: { HasDeviceKey: false } })
                    ]),
                    logger: silentLogger()
                });
                throw new Error('unexpected success');
            } catch (error) {
                expect(error.message).to.include('Could not verify bridge DeviceKey');
                expect(calls).to.have.length(1);
            }
        });

        it('includes server error details when first-time setup is rejected', async function() {
            var calls = [];

            try {
                await miataruHttp.verifyOrSetDeviceKey(configUtils.normalizeConfig(baseConfig()), {
                    fetch: fakeFetch(calls, [
                        fakeResponse(403, { error: 'DeviceKey must be set for this device' }),
                        fakeResponse(403, { error: 'CurrentDeviceKey does not match' })
                    ]),
                    logger: silentLogger()
                });
                throw new Error('unexpected success');
            } catch (error) {
                expect(error.message).to.include('HTTP 403 - CurrentDeviceKey does not match');
                expect(calls).to.have.length(2);
            }
        });

        it('fails startup when an existing wrong key prevents setup', async function() {
            var calls = [];

            try {
                await miataruHttp.verifyOrSetDeviceKey(configUtils.normalizeConfig(baseConfig()), {
                    fetch: fakeFetch(calls, [
                        fakeResponse(403, { error: 'Forbidden' }),
                        fakeResponse(403, { error: 'CurrentDeviceKey is required' })
                    ]),
                    logger: silentLogger()
                });
                throw new Error('unexpected success');
            } catch (error) {
                expect(error.message).to.include('Could not set configured bridge DeviceKey');
                expect(calls).to.have.length(2);
            }
        });
    });

    describe('bridge runtime', function() {
        it('publishes raw Miataru locations to sanitized MQTT topics', function() {
            var config = configUtils.normalizeConfig(baseConfig({
                mqtt: {
                    topicPrefix: '/demo/'
                }
            }));
            var mqttClient = fakeMqttClient();
            var bridge = bridgeModule.createBridge({
                config: config,
                mqtt: fakeMqttModule(mqttClient),
                WebSocket: fakeWebSocketFactory([]),
                logger: silentLogger()
            });

            bridge._state.mqttClient = mqttClient;
            bridge._state.mqttConnected = true;
            bridge._publishLocation({
                Device: 'a/b+c#d\u0000e',
                Timestamp: '123',
                Latitude: '1',
                Longitude: '2',
                HorizontalAccuracy: '3'
            });

            expect(mqttClient.published).to.have.length(1);
            expect(mqttClient.published[0].topic).to.equal('demo/a-b-c-d-e/location');
            expect(JSON.parse(mqttClient.published[0].payload)).to.deep.equal({
                Device: 'a/b+c#d\u0000e',
                Timestamp: '123',
                Latitude: '1',
                Longitude: '2',
                HorizontalAccuracy: '3'
            });
            expect(mqttClient.published[0].options).to.deep.equal({ qos: 0, retain: false });
        });

        it('subscribes, skips null snapshots, publishes updates, warns on slogan failure, and resubscribes after reconnect', async function() {
            var config = configUtils.normalizeConfig(baseConfig({
                reconnect: {
                    initialDelayMs: 1,
                    maxDelayMs: 1
                }
            }));
            var calls = [];
            var mqttClient = fakeMqttClient();
            var wsInstances = [];
            var logs = captureLogger();
            var bridge = bridgeModule.createBridge({
                config: config,
                mqtt: fakeMqttModule(mqttClient),
                WebSocket: fakeWebSocketFactory(wsInstances),
                fetch: fakeFetch(calls, [
                    fakeResponse(200, { MiataruDeviceSecurityStatus: { HasDeviceKey: true } }),
                    fakeResponse(403, { error: 'slogan failed' })
                ]),
                logger: logs
            });

            await bridge.start();
            expect(logs.warns.join('\n')).to.include('Could not set bridge slogan');

            wsInstances[0].emit('open');
            expect(JSON.parse(wsInstances[0].sent[0])).to.deep.equal({
                type: 'subscribe',
                MiataruConfig: {
                    RequestMiataruDeviceID: 'bridge-device',
                    RequestMiataruDeviceKey: 'bridge-secret'
                },
                MiataruGetLocation: [
                    { Device: 'target-a' },
                    { Device: 'target-b' }
                ]
            });

            wsInstances[0].emit('message', JSON.stringify({
                type: 'subscription',
                MiataruLocation: [
                    null,
                    { Device: 'target-a', Timestamp: '1000' }
                ]
            }));
            wsInstances[0].emit('message', JSON.stringify({ Device: 'target-b', Timestamp: '2000' }));

            expect(mqttClient.published.map(function(entry) { return entry.topic; })).to.deep.equal([
                'miataru/target-a/location',
                'miataru/target-b/location'
            ]);
            expect(logs.infos.join('\n')).to.include('Miataru subscription acknowledged: 1 initial location(s), 1 null/unavailable target(s).');
            expect(logs.warns.join('\n')).to.include('Some subscribed targets returned null');
            expect(logs.infos.join('\n')).to.include('Received Miataru location update for device target-b with timestamp 2000.');
            expect(logs.infos.join('\n')).to.include('Published Miataru location for device target-a to MQTT topic miataru/target-a/location.');
            expect(logs.infos.join('\n')).to.include('Published Miataru location for device target-b to MQTT topic miataru/target-b/location.');

            wsInstances[0].emit('close', 1006, Buffer.from('lost'));
            await delay(20);
            wsInstances[1].emit('open');

            expect(wsInstances).to.have.length(2);
            expect(JSON.parse(wsInstances[1].sent[0]).MiataruGetLocation).to.deep.equal([
                { Device: 'target-a' },
                { Device: 'target-b' }
            ]);

            bridge.stop();
        });
    });
});

function baseConfig(overrides) {
    overrides = overrides || {};

    return {
        miataru: Object.assign({
            baseUrl: 'https://service.miataru.com',
            webSocketUrl: 'wss://service.miataru.com/v1/ws/location',
            deviceId: 'bridge-device',
            deviceKey: 'bridge-secret',
            slogan: 'MQTT bridge'
        }, overrides.miataru || {}),
        subscriptions: Object.assign({
            deviceIds: ['target-a', 'target-b']
        }, overrides.subscriptions || {}),
        mqtt: Object.assign({
            brokerAddress: 'mqtt.example.com',
            port: 1883,
            topicPrefix: 'miataru'
        }, overrides.mqtt || {}),
        reconnect: Object.assign({}, overrides.reconnect || {})
    };
}

function fakeResponse(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status: status,
        text: function() {
            return Promise.resolve(JSON.stringify(body || {}));
        }
    };
}

function fakeFetch(calls, responses) {
    return function(url, options) {
        calls.push({ url: url, options: options });

        if (!responses.length) {
            throw new Error('No fake response configured');
        }

        return Promise.resolve(responses.shift());
    };
}

function fakeMqttModule(client) {
    return {
        connect: function() {
            process.nextTick(function() {
                client.emit('connect');
            });
            return client;
        }
    };
}

function fakeMqttClient() {
    var client = new EventEmitter();
    client.published = [];
    client.publish = function(topic, payload, options, callback) {
        client.published.push({
            topic: topic,
            payload: payload,
            options: options
        });

        if (callback) {
            callback();
        }
    };
    client.end = function() {};
    return client;
}

function fakeWebSocketFactory(instances) {
    function FakeWebSocket(url) {
        EventEmitter.call(this);
        this.url = url;
        this.sent = [];
        instances.push(this);
    }

    FakeWebSocket.prototype = Object.create(EventEmitter.prototype);
    FakeWebSocket.prototype.constructor = FakeWebSocket;
    FakeWebSocket.prototype.send = function(message) {
        this.sent.push(message);
    };
    FakeWebSocket.prototype.close = function() {};

    return FakeWebSocket;
}

function silentLogger() {
    return {
        info: function() {},
        warn: function() {}
    };
}

function captureLogger() {
    return {
        infos: [],
        warns: [],
        info: function(message) {
            this.infos.push(message);
        },
        warn: function(message) {
            this.warns.push(message);
        }
    };
}

function delay(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}
