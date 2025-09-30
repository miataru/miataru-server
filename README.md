# miataru-server

**Version 1.1.0** - Modernized server with enhanced features and improved security

This is the source code of a Miataru server side implementation. You can get more information [here](http://www.miataru.com).

## What is Miataru?

If you want to track where you have been and allow your own services and toolchain to access your location data you have a lot of options.

With most of the services that allow you to track your location over time you give away control over that very important piece of information. You simply don't know what all those service providers do with your data.

That's why Miataru was created. Miataru or 見当たる is Japanese and means "be found" or "to come across" and it's a set of client and server application that allow you to track your location and retain full control over your location data.

Since the server application and protocol will be fully opened and can be downloaded and hosted on your own servers this means you can be in full control every second of using Miataru.

If you do not have the option of hosting the Miataru server yourself we're offering a free service that allows you to connect the Miataru client applications with your own services.

By default Miataru does only store the last known location. And it only does that for a pre-defined amount of time. Nothing is written to any disk, everything is in-memory only and only available for a pre-defined time-window.

With it's simple API it allows you to use Miataru to your own needs and practices.

## API Endpoints

The Miataru server provides both versioned (v1) and legacy API endpoints for maximum compatibility:

### Version 1 API (Recommended)
- **POST** `/v1/UpdateLocation` - Store location data
- **POST** `/v1/GetLocation` - Retrieve current location
- **POST** `/v1/GetLocationGeoJSON` - Get location in GeoJSON format
- **GET** `/v1/GetLocationGeoJSON/:id?` - Get location in GeoJSON format via GET
- **POST** `/v1/GetLocationHistory` - Retrieve location history
- **POST** `/v1/GetVisitorHistory` - Retrieve visitor history
- **POST** `/v1/DeleteLocation` - Delete all location data for a device

### Legacy API (Backward Compatibility)
- **POST** `/UpdateLocation` - Store location data
- **POST** `/GetLocation` - Retrieve current location
- **POST** `/GetLocationGeoJSON` - Get location in GeoJSON format
- **GET** `/GetLocationGeoJSON/:id?` - Get location in GeoJSON format via GET
- **POST** `/GetLocationHistory` - Retrieve location history
- **POST** `/GetVisitorHistory` - Retrieve visitor history
- **POST** `/DeleteLocation` - Delete all location data for a device

## Run the Server

Check out the repo:  
`git clone git@github.com:miataru/miataru-server.git`

Install dependencies:  
`npm install`

Run the tests:  
`npm run test:all` (or `make run-all-tests`)

Configuration:
Adjust the configuration in `./config/` or add your own

Start Server:
`node server.js`

The server will, in the default configuration, listen on localhost port 8090. To do some test requests on the commandline, do this:

### Basic Examples

**Set a location:**
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8090/v1/UpdateLocation' \
  -d '{"MiataruConfig":{"EnableLocationHistory":"True","LocationDataRetentionTime":"15"},"MiataruLocation":[{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823","Timestamp":"1376735651302","Longitude":"10.837502","Latitude":"49.828925","HorizontalAccuracy":"50.00"}]}'
```

**Retrieve a location:**
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8090/v1/GetLocation' \
  -d '{"MiataruGetLocation":[{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823"}]}'
```

**Delete all location data for a device:**
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8090/v1/DeleteLocation' \
  -d '{"MiataruDeleteLocation":{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823"}}'
```

**Get location in GeoJSON format:**
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8090/v1/GetLocationGeoJSON' \
  -d '{"MiataruGetLocation":[{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823"}]}'
```

## DeleteLocation API

The DeleteLocation API allows you to permanently delete all location data associated with a specific device.

### Request Format
```json
{
  "MiataruDeleteLocation": {
    "Device": "device-id-here"
  }
}
```

### Response Format
```json
{
  "MiataruResponse": "ACK",
  "MiataruVerboseResponse": "Location data deleted for device: device-id-here",
  "MiataruDeletedCount": 3
}
```

### What Gets Deleted
- **Last Known Location**: Current location data
- **Location History**: Complete location history (if enabled)
- **Visitor History**: Visitor tracking data

### Example Usage
```bash
# Delete all location data for a device
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8090/v1/DeleteLocation' \
  -d '{"MiataruDeleteLocation":{"Device":"my-device-123"}}'
```

For detailed documentation, see [DELETE_LOCATION_API.md](docs/DELETE_LOCATION_API.md).

## CORS Configuration

The server includes configurable CORS (Cross-Origin Resource Sharing) middleware for web applications:

### Default Configuration
```javascript
cors: {
    allowedOrigins: ["http://localhost:3000", "http://localhost:8080", "https://miataru.com"]
}
```

### Custom CORS Setup
Add to your configuration file:
```javascript
module.exports = {
    // ... other config
    cors: {
        allowedOrigins: [
            "http://localhost:3000",
            "https://yourdomain.com",
            "https://app.yourdomain.com"
        ]
    }
};
```

### CORS Features
- **Origin Validation**: Only allows requests from configured origins
- **Credentials Support**: Supports authenticated requests
- **Method Support**: GET, POST, PUT, DELETE, OPTIONS
- **Header Support**: Content-Type, Authorization, X-Requested-With
- **Preflight Handling**: Automatic OPTIONS request handling

## Rate Limiting

The server includes configurable rate limiting for both inbound HTTP requests and Redis operations to help protect the service under load.

### HTTP Request Limiting

Requests are tracked per client IP address. Each IP can use a limited number of concurrent connections while additional requests wait in a bounded queue. The defaults can be adjusted in `config/default.js` or your own configuration file:

```javascript
rateLimiting: {
    http: {
        enabled: true,
        maxConcurrentPerIp: 10,      // Maximum in-flight requests allowed per IP
        maxQueuePerIp: 50,           // Additional requests queued per IP
        queueTimeoutMs: 0,           // Optional timeout (0 keeps waiting indefinitely)
        rejectionStatusCode: 429,    // Status code returned when the queue is full
        rejectionMessage: 'Too Many Requests',
        timeoutMessage: 'Request timed out while waiting in rate limit queue'
    },
    // ...
}
```

If the queue limit is exceeded the server responds with HTTP 429 and the configured message. Requests that wait longer than `queueTimeoutMs` are also rejected.

### Redis Concurrency Limiting

Redis commands are throttled with a global concurrency limiter to avoid overwhelming the datastore. Configuration is available under the same `rateLimiting` section:

```javascript
rateLimiting: {
    // ...
    redis: {
        enabled: true,
        maxConcurrent: 50,       // Parallel Redis commands allowed
        maxQueue: 100,           // Additional queued Redis commands
        queueTimeoutMs: 30000    // Time to wait before failing a queued command
    }
}
```

When the queue is full, Redis operations fail fast with an error indicating the concurrency limit was exceeded. Operations that wait longer than `queueTimeoutMs` are rejected with a timeout error.

## Docker

You can use the included Dockerfile to build your own docker image for running a miataru server.

It is based upon the current alpine version of the official nodejs image and will build itself to approx. 80mbyte of size.

To use run the docker build:
```bash
docker build -t miataru .
```

And run the image:
```bash
docker run -it -d --name miataru -p 3101:8090 miataru
```

It is going to use the default config, which is fakeredis right now. To use proper Redis and more complex
configurations please change the configuration and in such a case link the miataru container to a redis container.


### Configuration

Configurations are stored in `./config/`. 

A configuration file has to be a javascript file that exports a object (following the commonJS directive):
```
module.exports = {
  myFooKey: 'foo',
  myBarKey: {
    spam: 'eggs'
  }
}
```

The standard configuration `default.js` will always be loaded. 
In addition environment specific configs can be specified denoted by `{envName}.js`.
For development you can specify a user specific configuration in the form of `user.{userName}.js`.
This only works when the environment variable `NODE_ENV` is set to `development`.

In addition a external configuration can be speciefied via a command line parameter that comes in handy for production when you don't want to checkin sensibel access credentials into source control. The specified path has to be absolute.  
`node server.js --externalconfig=/etc/miataru/config.js`

All other command line parameters get merged into the configuration.

## RequestLocation Validation

The Miataru server validates all location data through the `RequestLocation` model to ensure data integrity and proper API usage.

### Required Properties

The following properties are **required** for all location updates:

- `Device` - Device identifier
- `Timestamp` - Unix timestamp of the location
- `Longitude` - Longitude coordinate
- `Latitude` - Latitude coordinate  
- `HorizontalAccuracy` - Accuracy of the location data

### Optional Properties (New Fields)

The following properties are **optional** and default to `-1` when not provided:

- `Speed` - Speed in appropriate units
- `BatteryLevel` - Battery level percentage
- `Altitude` - Altitude above sea level

### Validation Behavior

| Scenario | Behavior | Error |
|----------|----------|-------|
| Missing required property | Throws `BadRequestError` | `Missing RequestProperty {property} in location` |
| Required property = `null` | Throws `BadRequestError` | `Missing RequestProperty {property} in location` |
| Required property = `false` | **Accepted** (backward compatibility) | None |
| Valid required property | Accepted | None |
| Optional property omitted | Defaults to `-1` | None |
| Optional property = `-1` | Accepted (excluded from response) | None |

### Example Usage

```javascript
// Valid location update with all fields
{
  "Device": "my-device-123",
  "Timestamp": "1376735651302", 
  "Longitude": "10.837502",
  "Latitude": "49.828925",
  "HorizontalAccuracy": "50.00",
  "Speed": "25.5",
  "BatteryLevel": "85",
  "Altitude": "120.5"
}

// Valid location update with only required fields
{
  "Device": "my-device-123",
  "Timestamp": "1376735651302",
  "Longitude": "10.837502", 
  "Latitude": "49.828925",
  "HorizontalAccuracy": "50.00"
  // Speed, BatteryLevel, Altitude will default to -1
}

// Invalid - missing required property
{
  "Device": "my-device-123",
  "Timestamp": "1376735651302",
  "Longitude": "10.837502",
  "Latitude": "49.828925"
  // Missing HorizontalAccuracy - will throw BadRequestError
}
```

## Backward Compatibility

The Miataru server maintains full backward compatibility with previous versions:

### Legacy Client Support

- **Old format requests** without new fields (`Speed`, `BatteryLevel`, `Altitude`) are fully supported
- **Legacy API endpoints** (`/UpdateLocation`, `/GetLocation`) continue to work alongside v1 endpoints
- **Data type compatibility** - both string and numeric values are accepted for all fields
- **Zero values** are properly handled for new fields

### Validation Compatibility

- **`false` values** for required properties are accepted (maintains compatibility with older clients)
- **Missing properties** still properly throw validation errors
- **New field behavior** remains unchanged (default to `-1` when omitted)

### Migration Notes

Existing clients do not need any changes. The server will:

1. Accept requests in the old format without new fields
2. Accept requests with `false` values for required properties  
3. Continue to validate missing properties and throw appropriate errors
4. Handle new fields gracefully when provided

## Testing

The Miataru server includes comprehensive test suites covering all functionality:

### Test Commands
```bash
# Run all tests
npm run test:all

# Run only unit tests
npm test

# Run only integration tests
npm run test:integration

# Run tests with Makefile (legacy)
make run-all-tests
```

### Test Coverage
- **Unit Tests**: Model validation, data handling, response generation
- **Integration Tests**: Complete API workflow testing
- **Backward Compatibility Tests**: Legacy client support verification
- **CORS Tests**: Cross-origin request handling
- **New Fields Tests**: Enhanced location data with Speed, BatteryLevel, Altitude
- **DeleteLocation Tests**: Data deletion functionality
- **Error Handling Tests**: Invalid request scenarios

### Test Files Structure
```
tests/
├── unit/                    # Unit tests for individual components
│   ├── dataHolder.tests.js
│   ├── requestDevice.tests.js
│   ├── requestLocationIntegration.tests.js
│   ├── responseDeleteLocation.tests.js
│   └── responseLocationGeoJSON.tests.js
├── integration/             # Integration tests for API endpoints
│   ├── api.tests.js
│   ├── backwardCompatibility.tests.js
│   ├── cors.tests.js
│   ├── deleteLocation.tests.js
│   ├── newFields.tests.js
│   └── unknownDevice.tests.js
└── testFiles/              # Test utilities and mock data
    └── calls.js
```

## Dependencies

### Core Dependencies
- **Node.js**: >= 18.0.0 (modernized for current LTS)
- **Express.js**: ^4.18.2 (web framework)
- **Redis**: ^4.6.10 (data storage with modern Redis v4+ compatibility)
- **FakeRedis**: ^2.0.0 (testing and development)

### Additional Dependencies
- **CORS**: ^2.8.5 (cross-origin resource sharing)
- **Body-Parser**: ^1.20.2 (request parsing)
- **Yargs**: ^17.7.2 (command line argument parsing)
- **Moment.js**: ^2.29.4 (date/time handling)
- **EJS**: ^3.1.9 (template engine)
- **Stylus**: ^0.59.0 (CSS preprocessing)

### Development Dependencies
- **Mocha**: ^10.2.0 (test framework)
- **Chai**: ^4.3.10 (assertion library)
- **Supertest**: ^7.1.4 (HTTP testing)

### Security Updates
- **Replaced Optimist**: Critical security vulnerabilities fixed by replacing with Yargs
- **Redis v4+ Support**: Updated Redis client for modern Redis versions
- **Dependency Updates**: All dependencies updated to latest secure versions

## Changelog

### Version 1.1.0 (Latest)

#### New Features
- **DeleteLocation API**: Complete data deletion functionality for devices
- **CORS Support**: Configurable cross-origin resource sharing middleware
- **Enhanced Location Fields**: Support for Speed, BatteryLevel, and Altitude
- **API Versioning**: v1 endpoints alongside legacy endpoints for better compatibility
- **Modern Redis Support**: Updated Redis client for Redis v4+ compatibility

#### Improvements
- **Node.js 18+ Support**: Modernized for current LTS version
- **Enhanced Testing**: Comprehensive test suite with 500+ tests
- **Better Error Handling**: Improved validation and error responses
- **Security Updates**: Fixed critical vulnerabilities in dependencies
- **Backward Compatibility**: Full support for legacy clients

#### Technical Updates
- **Express.js 4.18.2**: Updated web framework
- **Redis 4.6.10**: Modern Redis client with compatibility layer
- **Yargs 17.7.2**: Secure command-line argument parsing
- **Comprehensive CORS**: Origin validation, credentials support, preflight handling

#### API Enhancements
- **New Endpoints**: `/v1/DeleteLocation` for data management
- **GeoJSON Support**: Enhanced GeoJSON responses with new fields
- **Input Validation**: Robust validation with backward compatibility
- **Response Models**: Improved response structures and error handling

#### Testing & Quality
- **Unit Tests**: 200+ unit tests for all components
- **Integration Tests**: 300+ integration tests for API workflows
- **Backward Compatibility Tests**: Legacy client support verification
- **CORS Tests**: Cross-origin request handling validation
- **Error Handling Tests**: Comprehensive error scenario coverage
