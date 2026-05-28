# Miataru WebSocket MQTT Bridge

Demo CLI that subscribes to Miataru live location updates over `/v1/ws/location` and publishes each non-null location update to MQTT.

## Behavior

- Reads a JSON configuration file passed with `--config`.
- Verifies the bridge device identity before subscribing.
- If the configured bridge device has no `DeviceKey` yet, tries first-time setup with the configured key.
- Treats verification as successful only when `/v1/getDeviceSecurityStatus` confirms `HasDeviceKey: true`.
- Fails startup when the configured key cannot be verified or an existing different key prevents setup.
- Sends the configured slogan with `/v1/setDeviceSlogan` after key verification. Slogan failures are warnings only.
- Subscribes to all configured target DeviceIDs on one WebSocket connection.
- Publishes every non-null initial snapshot and live update to MQTT.
- Publishes the raw Miataru location object as JSON without changing the payload shape.
- Does not buffer location updates while MQTT is disconnected.
- Logs subscription acknowledgements, null/unavailable targets, received live updates, and successful MQTT publishes.
- Supports `--errors-only` to suppress info/warning runtime logs and print only errors.

## MQTT Topic And Payload

Topic:

```text
<topicPrefix>/<sanitizedDeviceId>/location
```

The topic prefix is trimmed of leading and trailing slashes. Device IDs are used as-is except MQTT topic-critical characters `/`, `+`, `#`, and NUL are replaced with `-`.

Payload example:

```json
{
  "Device": "target-device-a",
  "Timestamp": "1376735651302",
  "Longitude": "10.837502",
  "Latitude": "49.828925",
  "HorizontalAccuracy": "50.00"
}
```

MQTT publishes use QoS `0` and `retain: false`.

## Configuration

Copy `config.example.json` and edit it:

```json
{
  "miataru": {
    "baseUrl": "https://service.miataru.com",
    "webSocketUrl": "wss://service.miataru.com/v1/ws/location",
    "deviceId": "mqtt-bridge-device-id",
    "deviceKey": "replace-with-a-strong-device-key",
    "slogan": "MQTT bridge"
  },
  "subscriptions": {
    "deviceIds": ["target-device-a", "target-device-b"]
  },
  "mqtt": {
    "brokerAddress": "mqtt.example.com",
    "port": 1883,
    "username": "optional-user",
    "password": "optional-password",
    "topicPrefix": "miataru",
    "clientId": "miataru-websocket-mqtt-bridge"
  }
}
```

Required fields:

- `miataru.baseUrl`: HTTP(S) base URL for Miataru REST calls.
- `miataru.deviceId`: requester DeviceID for the bridge.
- `miataru.deviceKey`: requester DeviceKey for the bridge. Keep this secret.
- `miataru.slogan`: slogan sent after key verification.
- `subscriptions.deviceIds`: target devices to subscribe to.
- `mqtt.brokerAddress`: MQTT broker host or URL.
- `mqtt.port`: MQTT broker port.
- `mqtt.topicPrefix`: MQTT topic prefix.

Optional fields:

- `miataru.webSocketUrl`: explicit WebSocket URL. If omitted, it is derived from `baseUrl`.
- `mqtt.username`, `mqtt.password`, `mqtt.clientId`: MQTT connection options.
- `reconnect.initialDelayMs`, `reconnect.maxDelayMs`: WebSocket reconnect backoff.

## Local Run

```bash
cd dev/websocket-mqtt-bridge
npm install
node bridge.js --config ./config.json
```

Only print errors:

```bash
node bridge.js --config ./config.json --errors-only
```

## Docker

Build:

```bash
docker build -t miataru-ws-mqtt-bridge dev/websocket-mqtt-bridge
```

Run with a mounted config file:

```bash
docker run --rm \
  -v "$PWD/config.json:/config/config.json:ro" \
  miataru-ws-mqtt-bridge --config /config/config.json
```

Docker with only error output:

```bash
docker run --rm \
  -v "$PWD/config.json:/config/config.json:ro" \
  miataru-ws-mqtt-bridge --config /config/config.json --errors-only
```

## Security Notes

- Do not put `deviceKey` in command-line arguments, URLs, logs, or MQTT topics.
- Use `wss://` for production Miataru WebSocket connections.
- Use TLS-enabled MQTT transport when crossing untrusted networks.
- The bridge can only set its key during first-time setup. If a different key already exists, startup fails because the current key is required to rotate it.
- Startup logs explicitly report whether the configured key was verified, set for the first time, or rejected by the server.

## Limitations

- This is a demo bridge, not a guaranteed delivery queue.
- MQTT QoS is fixed to `0`, retain is fixed to `false`.
- Location updates received while MQTT is disconnected are dropped.
- The bridge forwards only current-location WebSocket events, not location history.
- A `null` subscription snapshot means the target is denied, unknown, or currently has no stored location; the server intentionally does not reveal which case applies.
