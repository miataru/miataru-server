# New Fields Testing Documentation

This document describes the comprehensive test suite for the new fields (Speed, BatteryLevel, Altitude) added to the miataru-server implementation.

## Test Structure

### Unit Tests

#### `tests/unit/dataHolder.tests.js`
- **RequestLocation Model Tests**: Comprehensive tests for the RequestLocation model with new fields
  - Old format compatibility (no new fields)
  - New format with all fields
  - Mixed format with partial fields
  - Handling of -1 values (excluded from output)
  - Zero values handling
  - Getter methods for new fields
  - Default values (-1 when not provided)
  - String vs numeric value handling

#### `tests/unit/responseLocationGeoJSON.tests.js`
- **ResponseLocationGeoJSON Model Tests**: Tests for GeoJSON response generation
  - GeoJSON generation with new fields in properties
  - Handling locations without new fields
  - Partial new fields handling
  - Empty location list handling
  - Missing coordinates handling
  - Multiple locations (uses first one)

#### `tests/unit/requestLocationIntegration.tests.js`
- **Integration Tests**: End-to-end data flow tests
  - Complete data flow from request to response
  - Backward compatibility in data flow
  - Mixed data scenarios
  - GeoJSON generation with new fields

### Integration Tests

#### `tests/integration/newFields.tests.js`
- **New Fields API Tests**: Tests for all API endpoints with new fields
  - UpdateLocation with new fields (all, partial, -1 values)
  - GetLocation with new fields
  - GetLocationGeoJSON with new fields in properties
  - GetLocationHistory with new fields
  - Mixed field scenarios

#### `tests/integration/backwardCompatibility.tests.js`
- **Backward Compatibility Tests**: Ensures old clients continue to work
  - Old client format acceptance
  - Old format data return for old clients
  - Legacy API endpoint compatibility
  - Data type compatibility (string vs numeric)
  - Error handling compatibility

#### `tests/integration/interoperability.tests.js`
- **Interoperability Tests**: Tests interaction between old and new clients
  - Old client updates, new client reads
  - New client updates, old client reads
  - Mixed client scenarios
  - API version compatibility
  - Data persistence across client types

## Test Coverage

### Backward Compatibility
- ✅ Old clients can send data without new fields
- ✅ Old clients receive data without new fields (when stored by old clients)
- ✅ Old clients can read data with new fields (graceful handling)
- ✅ Legacy API endpoints work with new fields
- ✅ Error handling remains unchanged

### New Fields Functionality
- ✅ New fields are accepted in UpdateLocation
- ✅ New fields are returned in GetLocation
- ✅ New fields are included in GetLocationGeoJSON properties
- ✅ New fields are preserved in GetLocationHistory
- ✅ Fields with -1 values are excluded from output
- ✅ Zero values are included in output
- ✅ Partial field scenarios work correctly

### Data Types
- ✅ String values for new fields
- ✅ Numeric values for new fields
- ✅ Zero values handling
- ✅ -1 values handling (exclusion from output)

### Interoperability
- ✅ Old and new clients can interact seamlessly
- ✅ Data persistence works across client types
- ✅ Mixed update scenarios work correctly
- ✅ API version compatibility maintained

## Running Tests

### Unit Tests Only (Recommended)
```bash
npm test
```

### Integration Tests (requires running server)
```bash
npm run test:integration
```

### All Tests (requires running server)
```bash
npm run test:all
```

### Manual Test Execution
```bash
# Unit tests with correct environment
NODE_ENV=test ./node_modules/mocha/bin/mocha tests/unit/ --reporter spec

# Integration tests (requires server)
NODE_ENV=test ./node_modules/mocha/bin/mocha tests/integration/ --reporter spec

# Specific test files
NODE_ENV=test ./node_modules/mocha/bin/mocha tests/unit/dataHolder.tests.js tests/unit/responseLocationGeoJSON.tests.js tests/unit/requestLocationIntegration.tests.js --reporter spec
```

### Important Note
The tests require `NODE_ENV=test` to load the correct configuration. The npm scripts automatically set this environment variable.

## Test Data Examples

### Old Format (Backward Compatible)
```json
{
  "Device": "test-device",
  "Timestamp": "1376735651302",
  "Longitude": "10.837502",
  "Latitude": "49.828925",
  "HorizontalAccuracy": "50.00"
}
```

### New Format (All Fields)
```json
{
  "Device": "test-device",
  "Timestamp": "1376735651302",
  "Longitude": "10.837502",
  "Latitude": "49.828925",
  "HorizontalAccuracy": "50.00",
  "Speed": "25.5",
  "BatteryLevel": "85",
  "Altitude": "120.5"
}
```

### Mixed Format (Partial Fields)
```json
{
  "Device": "test-device",
  "Timestamp": "1376735651302",
  "Longitude": "10.837502",
  "Latitude": "49.828925",
  "HorizontalAccuracy": "50.00",
  "Speed": "15.2"
}
```

### Unknown Values (-1)
```json
{
  "Device": "test-device",
  "Timestamp": "1376735651302",
  "Longitude": "10.837502",
  "Latitude": "49.828925",
  "HorizontalAccuracy": "50.00",
  "Speed": -1,
  "BatteryLevel": -1,
  "Altitude": -1
}
```

## Expected Behavior

1. **New fields are optional**: Clients can send them or not
2. **-1 values are excluded**: Fields with -1 values are not included in the output
3. **Zero values are included**: Fields with 0 values are included in the output
4. **Backward compatibility**: Old clients continue to work unchanged
5. **Forward compatibility**: New clients can read data from old clients
6. **Data persistence**: All field combinations are stored and retrieved correctly
