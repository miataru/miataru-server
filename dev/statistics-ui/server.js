const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const { createClient } = require('redis');
const Redis = require('ioredis');
const http = require('http');
const WebSocket = require('ws');

const config = {
  port: Number(process.env.PORT || 3000),
  authUser: process.env.STATS_AUTH_USER || 'miataru',
  authPass: process.env.STATS_AUTH_PASS || 'change-me',
  prodRedisUrl: process.env.PROD_REDIS_URL || 'redis://localhost:6379',
  statsRedisUrl: process.env.STATS_REDIS_URL || 'redis://localhost:6380',
  prodNamespace: process.env.PROD_REDIS_NAMESPACE || 'miad',
  statsNamespace: process.env.STATS_REDIS_NAMESPACE || 'miad:stats',
  mapMaxDevices: Number(process.env.MAP_MAX_DEVICES || 2000),
  activeWindowMinutes: Number(process.env.ACTIVE_WINDOW_MINUTES || 15),
  bootstrapScanEnabled: process.env.BOOTSTRAP_SCAN_ENABLED === 'true',
  bootstrapScanBatchSize: Number(process.env.BOOTSTRAP_SCAN_BATCH || 250),
  bootstrapScanIntervalMs: Number(process.env.BOOTSTRAP_SCAN_INTERVAL_MS || 0),
  enableMonitor: process.env.MONITOR_ENABLED !== 'false',
  mockData: process.env.MOCK_DATA === 'true',
  statsBroadcastIntervalMs: Number(process.env.STATS_BROADCAST_INTERVAL_MS || 5000),
  mapBroadcastIntervalMs: Number(process.env.MAP_BROADCAST_INTERVAL_MS || 10000)
};

const app = express();

app.use(
  basicAuth({
    users: { [config.authUser]: config.authPass },
    challenge: true
  })
);

app.use(express.static(path.join(__dirname, 'public')));

const statsKeys = {
  lastSeen: `${config.statsNamespace}:devices:last_seen`,
  lastLocation: `${config.statsNamespace}:devices:last_location`,
  trailPrefix: `${config.statsNamespace}:devices:trail`,
  updatesTotal: `${config.statsNamespace}:updates:total`,
  updatesMinutePrefix: `${config.statsNamespace}:updates:minute:`,
  uniqueDayPrefix: `${config.statsNamespace}:unique:day:`
};

let prodClient;
let statsClient;
let wsServer;
let wsAuthToken;
let monitorClient;
let bootstrapInProgress = false;
let lastBootstrapAttempt = 0;
const bootstrapCooldownMs = 5 * 60 * 1000;

function normalizeTimestamp(value) {
  if (!value) {
    return Date.now();
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return Date.now();
  }
  return numeric < 1e12 ? numeric * 1000 : numeric;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDeviceIdFromKey(key) {
  const regex = new RegExp(`^${escapeRegex(config.prodNamespace)}:(.+):last$`);
  const match = key.match(regex);
  return match ? match[1] : null;
}

function getTrailKey(deviceId) {
  return `${statsKeys.trailPrefix}:${deviceId}`;
}

async function updateStatsFromLocation(deviceId, payload, source) {
  if (!statsClient) {
    return;
  }

  const timestampMs = normalizeTimestamp(payload.Timestamp || payload.timestamp || payload.TimeStamp);
  const latitude = Number(payload.Latitude || payload.latitude);
  const longitude = Number(payload.Longitude || payload.longitude);
  const accuracy = Number(payload.HorizontalAccuracy || payload.horizontalAccuracy || payload.Accuracy || payload.accuracy);
  const minuteBucket = Math.floor(timestampMs / 60000);
  const dayBucket = new Date(timestampMs).toISOString().slice(0, 10);

  const locationEntry = {
    deviceId,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    timestampMs,
    source
  };

  const pipeline = statsClient.multi();
  pipeline.zAdd(statsKeys.lastSeen, [{ score: timestampMs, value: deviceId }]);
  pipeline.hSet(statsKeys.lastLocation, deviceId, JSON.stringify(locationEntry));
  if (Number.isFinite(locationEntry.latitude) && Number.isFinite(locationEntry.longitude)) {
    const trailEntry = JSON.stringify({
      latitude: locationEntry.latitude,
      longitude: locationEntry.longitude,
      timestampMs: locationEntry.timestampMs
    });
    pipeline.lPush(getTrailKey(deviceId), trailEntry);
    pipeline.lTrim(getTrailKey(deviceId), 0, 49);
  }
  pipeline.incr(statsKeys.updatesTotal);
  pipeline.incr(`${statsKeys.updatesMinutePrefix}${minuteBucket}`);
  pipeline.expire(`${statsKeys.updatesMinutePrefix}${minuteBucket}`, 60 * 60 * 2);
  pipeline.pfAdd(`${statsKeys.uniqueDayPrefix}${dayBucket}`, deviceId);
  pipeline.expire(`${statsKeys.uniqueDayPrefix}${dayBucket}`, 60 * 60 * 24 * 400);
  await pipeline.exec();
}

function extractLocationPayload(args, fallbackValue) {
  if (!Array.isArray(args) || args.length === 0) {
    return fallbackValue;
  }

  const command = String(args[0] || '').toUpperCase();
  if (command === 'SET' && args.length >= 3) {
    return args[2];
  }
  if (command === 'SETEX' && args.length >= 4) {
    return args[3];
  }
  if (command === 'PSETEX' && args.length >= 4) {
    return args[3];
  }

  return fallbackValue;
}

async function handleMonitorEvent(time, args) {
  if (!args || args.length < 2) {
    return;
  }

  const command = String(args[0] || '').toUpperCase();
  if (command !== 'SET' && command !== 'SETEX' && command !== 'PSETEX') {
    return;
  }

  const key = args[1];
  const deviceId = getDeviceIdFromKey(key);
  if (!deviceId) {
    return;
  }

  let payloadString = extractLocationPayload(args, null);
  if (!payloadString) {
    try {
      payloadString = await prodClient.get(key);
    } catch (error) {
      console.warn('Failed to fetch value for key during monitor:', error.message);
    }
  }

  if (!payloadString) {
    return;
  }

  let payload;
  try {
    payload = JSON.parse(payloadString);
  } catch (error) {
    console.warn('Failed to parse location payload:', error.message);
    return;
  }

  await updateStatsFromLocation(deviceId, payload, 'monitor');
  broadcastLocationUpdate(deviceId, payload);
}

async function bootstrapScan({ force = false } = {}) {
  if (!config.bootstrapScanEnabled && !force) {
    return;
  }

  let cursor = '0';
  const matchPattern = `${config.prodNamespace}:*:last`;

  do {
    const scanResult = await prodClient.scan(cursor, {
      MATCH: matchPattern,
      COUNT: config.bootstrapScanBatchSize
    });
    const nextCursor = Array.isArray(scanResult) ? scanResult[0] : scanResult.cursor;
    const keys = Array.isArray(scanResult)
      ? (scanResult[1] || [])
      : (scanResult.keys || []);
    cursor = String(nextCursor || '0');

    if (keys.length === 0) {
      continue;
    }

    const values = await prodClient.mGet(keys);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const payloadString = values[i];
      if (!payloadString) {
        continue;
      }

      const deviceId = getDeviceIdFromKey(key);
      if (!deviceId) {
        continue;
      }

      try {
        const payload = JSON.parse(payloadString);
        await updateStatsFromLocation(deviceId, payload, 'bootstrap');
      } catch (error) {
        console.warn('Failed to parse bootstrap payload:', error.message);
      }
    }
  } while (cursor !== '0');
}

async function ensureStatsSeeded() {
  if (config.mockData || config.bootstrapScanEnabled || !statsClient) {
    return;
  }

  const now = Date.now();
  if (bootstrapInProgress || now - lastBootstrapAttempt < bootstrapCooldownMs) {
    return;
  }

  const existingCount = await statsClient.zCard(statsKeys.lastSeen);
  if (existingCount > 0) {
    return;
  }

  bootstrapInProgress = true;
  lastBootstrapAttempt = now;
  try {
    await bootstrapScan({ force: true });
  } catch (error) {
    console.warn('Bootstrap scan failed:', error.message);
  } finally {
    bootstrapInProgress = false;
  }
}

function getWindowMillis(windowParam) {
  switch (windowParam) {
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
    case '365d':
      return 365 * 24 * 60 * 60 * 1000;
    case '24h':
    default:
      return 24 * 60 * 60 * 1000;
  }
}

async function getStatsSnapshot() {
  await ensureStatsSeeded();
  const now = Date.now();
  const window24h = now - 24 * 60 * 60 * 1000;
  const window7d = now - 7 * 24 * 60 * 60 * 1000;
  const window30d = now - 30 * 24 * 60 * 60 * 1000;
  const window365d = now - 365 * 24 * 60 * 60 * 1000;
  const currentWindow = now - config.activeWindowMinutes * 60 * 1000;

  const minuteBucket = Math.floor(now / 60000);
  const minuteKeys = [];
  for (let i = 0; i < 60; i += 1) {
    minuteKeys.push(`${statsKeys.updatesMinutePrefix}${minuteBucket - i}`);
  }

  const pipeline = statsClient.multi();
  pipeline.zCard(statsKeys.lastSeen);
  pipeline.zCount(statsKeys.lastSeen, window24h, now);
  pipeline.zCount(statsKeys.lastSeen, window7d, now);
  pipeline.zCount(statsKeys.lastSeen, window30d, now);
  pipeline.zCount(statsKeys.lastSeen, window365d, now);
  pipeline.zCount(statsKeys.lastSeen, currentWindow, now);
  pipeline.get(statsKeys.updatesTotal);
  pipeline.mGet(minuteKeys);
  const dayKey = `${statsKeys.uniqueDayPrefix}${new Date(now).toISOString().slice(0, 10)}`;
  pipeline.pfCount(dayKey);

  const execResults = await pipeline.exec();
  const normalizeExecItem = (item) => {
    if (Array.isArray(item) && item.length === 2 && (item[0] === null || item[0] instanceof Error)) {
      return item[1];
    }
    return item;
  };
  const results = execResults.map(normalizeExecItem);
  const [
    totalKnown,
    active24h,
    active7d,
    active30d,
    active365d,
    activeCurrent,
    updatesTotal,
    updatesMinuteValues,
    uniqueToday
  ] = results;

  const safeUpdatesMinuteValues = Array.isArray(updatesMinuteValues)
    ? updatesMinuteValues
    : [];

  const updatesLastHour = safeUpdatesMinuteValues
    .map((value) => Number(value || 0))
    .reduce((sum, value) => sum + value, 0);

  return {
    totalKnownDevices: Number(totalKnown || 0),
    activeDevices: {
      currentWindowMinutes: config.activeWindowMinutes,
      current: Number(activeCurrent || 0),
      last24h: Number(active24h || 0),
      last7d: Number(active7d || 0),
      last30d: Number(active30d || 0),
      last365d: Number(active365d || 0)
    },
    updates: {
      total: Number(updatesTotal || 0),
      lastHour: updatesLastHour
    },
    uniqueDevicesToday: Number(uniqueToday || 0),
    generatedAt: new Date(now).toISOString()
  };
}

async function getMapSnapshot(windowParam) {
  await ensureStatsSeeded();
  const now = Date.now();
  const windowMs = getWindowMillis(windowParam);
  const minTimestamp = now - windowMs;

  const deviceIds = await statsClient.zRangeByScore(
    statsKeys.lastSeen,
    minTimestamp,
    now,
    {
      LIMIT: {
        offset: 0,
        count: config.mapMaxDevices
      }
    }
  );

  if (deviceIds.length === 0) {
    return { devices: [], generatedAt: new Date(now).toISOString() };
  }

  const locations = await statsClient.hmGet(statsKeys.lastLocation, deviceIds);
  const trailPipeline = statsClient.multi();
  deviceIds.forEach((deviceId) => {
    trailPipeline.lRange(getTrailKey(deviceId), 0, 49);
  });
  const trailResults = await trailPipeline.exec();
  const normalizeExecItem = (item) => {
    if (Array.isArray(item) && item.length === 2 && (item[0] === null || item[0] instanceof Error)) {
      return item[1];
    }
    return item;
  };
  const devices = [];

  for (let i = 0; i < deviceIds.length; i += 1) {
    const value = locations[i];
    const trailResult = normalizeExecItem(trailResults?.[i]);
    const trailEntries = Array.isArray(trailResult) ? trailResult : [];
    if (!value) {
      continue;
    }
    try {
      const parsed = JSON.parse(value);
      if (Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) {
        const trail = trailEntries
          .map((entry) => {
            try {
              return JSON.parse(entry);
            } catch (error) {
              return null;
            }
          })
          .filter((entry) => entry && Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude))
          .reverse();
        devices.push({
          ...parsed,
          trail
        });
      }
    } catch (error) {
      console.warn('Failed to parse cached location:', error.message);
    }
  }

  return {
    devices,
    generatedAt: new Date(now).toISOString(),
    window: windowParam
  };
}

function mockStatsSnapshot() {
  const now = new Date();
  return {
    totalKnownDevices: 12450,
    activeDevices: {
      currentWindowMinutes: config.activeWindowMinutes,
      current: 112,
      last24h: 942,
      last7d: 4200,
      last30d: 8900,
      last365d: 12000
    },
    updates: {
      total: 892340,
      lastHour: 840
    },
    uniqueDevicesToday: 610,
    generatedAt: now.toISOString()
  };
}

function mockMapSnapshot(windowParam) {
  return {
    window: windowParam,
    generatedAt: new Date().toISOString(),
    devices: [
      {
        deviceId: 'demo-device-1',
        latitude: 52.520008,
        longitude: 13.404954,
        accuracy: 20,
        timestampMs: Date.now() - 1000 * 60 * 15,
        source: 'mock',
        trail: [
          { latitude: 52.518, longitude: 13.402, timestampMs: Date.now() - 1000 * 60 * 45 },
          { latitude: 52.519, longitude: 13.403, timestampMs: Date.now() - 1000 * 60 * 30 },
          { latitude: 52.520008, longitude: 13.404954, timestampMs: Date.now() - 1000 * 60 * 15 }
        ]
      },
      {
        deviceId: 'demo-device-2',
        latitude: 48.137154,
        longitude: 11.576124,
        accuracy: 30,
        timestampMs: Date.now() - 1000 * 60 * 45,
        source: 'mock',
        trail: [
          { latitude: 48.1355, longitude: 11.5735, timestampMs: Date.now() - 1000 * 60 * 90 },
          { latitude: 48.1362, longitude: 11.5748, timestampMs: Date.now() - 1000 * 60 * 60 },
          { latitude: 48.137154, longitude: 11.576124, timestampMs: Date.now() - 1000 * 60 * 45 }
        ]
      }
    ]
  };
}

function buildBasicAuthToken() {
  return Buffer.from(`${config.authUser}:${config.authPass}`).toString('base64');
}

function isAuthorizedWsRequest(request) {
  const authHeader = request.headers.authorization || '';
  const url = new URL(request.url, `http://${request.headers.host}`);
  const tokenFromQuery = url.searchParams.get('token');

  if (authHeader.startsWith('Basic ')) {
    return authHeader.slice('Basic '.length).trim() === wsAuthToken;
  }

  if (tokenFromQuery) {
    return tokenFromQuery === wsAuthToken;
  }

  return false;
}

function createServer() {
  const httpServer = http.createServer(app);
  wsServer = new WebSocket.Server({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (!isAuthorizedWsRequest(request)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (client) => {
      wsServer.emit('connection', client, request);
    });
  });

  wsServer.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected', at: new Date().toISOString() }));
  });

  return httpServer;
}

function broadcast(event) {
  if (!wsServer) {
    return;
  }

  const payload = JSON.stringify(event);
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastLocationUpdate(deviceId, payload) {
  if (!wsServer) {
    return;
  }

  const timestampMs = normalizeTimestamp(payload.Timestamp || payload.timestamp || payload.TimeStamp);
  const latitude = Number(payload.Latitude || payload.latitude);
  const longitude = Number(payload.Longitude || payload.longitude);
  const accuracy = Number(payload.HorizontalAccuracy || payload.horizontalAccuracy || payload.Accuracy || payload.accuracy);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return;
  }

  broadcast({
    type: 'location',
    deviceId,
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    timestampMs,
    source: 'monitor'
  });
}

function startBroadcastLoops() {
  if (config.mockData) {
    return;
  }

  setInterval(async () => {
    try {
      const snapshot = await getStatsSnapshot();
      broadcast({ type: 'stats', payload: snapshot });
    } catch (error) {
      console.warn('Stats broadcast failed:', error.message);
    }
  }, config.statsBroadcastIntervalMs);

  setInterval(async () => {
    try {
      const snapshot = await getMapSnapshot('24h');
      broadcast({ type: 'map', window: '24h', payload: snapshot });
    } catch (error) {
      console.warn('Map broadcast failed:', error.message);
    }
  }, config.mapBroadcastIntervalMs);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mock: config.mockData });
});

app.get('/api/stats', async (req, res) => {
  try {
    if (config.mockData) {
      res.json(mockStatsSnapshot());
      return;
    }

    const snapshot = await getStatsSnapshot();
    res.json(snapshot);
  } catch (error) {
    console.error('Failed to build stats snapshot:', error);
    res.status(500).json({ error: 'Failed to load statistics.' });
  }
});

app.get('/api/map', async (req, res) => {
  const windowParam = req.query.window || '24h';
  try {
    if (config.mockData) {
      res.json(mockMapSnapshot(windowParam));
      return;
    }

    const snapshot = await getMapSnapshot(windowParam);
    res.json(snapshot);
  } catch (error) {
    console.error('Failed to build map snapshot:', error);
    res.status(500).json({ error: 'Failed to load map data.' });
  }
});

app.get('/api/ws-token', (req, res) => {
  res.json({ token: wsAuthToken });
});

async function start() {
  wsAuthToken = buildBasicAuthToken();

  if (!config.mockData) {
    prodClient = createClient({ url: config.prodRedisUrl });
    statsClient = createClient({ url: config.statsRedisUrl });

    prodClient.on('error', (error) => {
      console.error('Prod Redis error:', error.message);
    });
    statsClient.on('error', (error) => {
      console.error('Stats Redis error:', error.message);
    });

    await Promise.all([prodClient.connect(), statsClient.connect()]);

    if (!config.bootstrapScanEnabled) {
      try {
        const existingCount = await statsClient.zCard(statsKeys.lastSeen);
        if (existingCount === 0) {
          console.log('Stats cache empty. Running one-time bootstrap scan...');
          await bootstrapScan({ force: true });
        }
      } catch (error) {
        console.warn('Failed to run bootstrap scan:', error.message);
      }
    }

    if (config.bootstrapScanEnabled) {
      console.log('Bootstrap scan enabled. Starting initial scan...');
      await bootstrapScan();

      if (config.bootstrapScanIntervalMs > 0) {
        setInterval(() => {
          bootstrapScan().catch((error) => {
            console.error('Bootstrap scan failed:', error.message);
          });
        }, config.bootstrapScanIntervalMs);
      }
    }

    if (config.enableMonitor) {
      monitorClient = new Redis(config.prodRedisUrl);
      monitorClient.on('error', (error) => {
        console.error('Monitor Redis error:', error.message);
      });

      const monitor = await monitorClient.monitor();
      monitor.on('monitor', (time, args) => {
        handleMonitorEvent(time, args).catch((error) => {
          console.warn('Monitor handler failed:', error.message);
        });
      });
      monitor.on('error', (error) => {
        console.error('Monitor client error:', error.message);
      });
      console.log('Redis MONITOR connected for live updates.');
    } else {
      console.log('Redis MONITOR disabled.');
    }

    startBroadcastLoops();
  } else {
    console.log('Mock mode enabled. Redis connections are skipped.');
  }

  const server = createServer();
  server.listen(config.port, () => {
    console.log(`Statistics UI listening on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start statistics UI:', error);
  process.exit(1);
});
