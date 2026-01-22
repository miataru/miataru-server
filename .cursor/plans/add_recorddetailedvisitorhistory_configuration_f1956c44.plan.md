---
name: Add recordDetailedVisitorHistory configuration
overview: "Add a configuration option `recordDetailedVisitorHistory` (default: false) that controls whether visitor history records every access separately (ON) or updates existing entries for the same device (OFF)."
todos:
  - id: add-config-option
    content: "Add recordDetailedVisitorHistory: false to config/default.js, config/test.js, and config/user.service.js"
    status: pending
  - id: create-helper-function
    content: Create helper function in location.js to handle visitor history recording with both modes
    status: pending
  - id: update-getlocationhistory
    content: Update getLocationHistory function to use the new helper
    status: pending
  - id: update-getlocation
    content: Update getLocation function to use the new helper
    status: pending
  - id: add-documentation
    content: Add comprehensive documentation section to README.md explaining all onfiguration options
    status: pending
---

# Add recordDetailedVisitorHistory Configuration Option

## Overview

Add a configuration option `recordDetailedVisitorHistory` that controls how visitor history is recorded. When OFF (default), each accessing device is only recorded once and updated on subsequent accesses. When ON, every access is recorded as a separate entry (current behavior).

## Implementation Details

### 1. Configuration

Update the following configuration files to include the new option:

- **`config/default.js`** - Main default configuration
  - Add `recordDetailedVisitorHistory: false` to the default configuration object
  - This will be the default value (OFF mode)

- **`config/test.js`** - Test configuration
  - Add `recordDetailedVisitorHistory: false` for consistency

- **`config/user.service.js`** - Example service configuration
  - Add `recordDetailedVisitorHistory: false` as an example configuration option

### 2. Visitor History Recording Logic

The visitor history is recorded in two places in `lib/routes/location/v1/location.js`:

#### Location 1: `getLocationHistory` function (lines 75-96)

Currently uses `db.lpush()` to always add a new entry.

#### Location 2: `getLocation` function (lines 225-246)  

Currently uses `db.lpush()` to always add a new entry.

### 3. Implementation Strategy

When `recordDetailedVisitorHistory` is **false** (OFF mode):

1. Read the entire visitor list using `db.lrange()`
2. Parse all JSON entries
3. Filter out any existing entry with the same `DeviceID` as the new visitor
4. Delete the entire list using `db.del()`
5. Re-add all filtered entries plus the new visitor entry using `db.lpush()`
6. Trim to max size using `db.ltrim()`

When `recordDetailedVisitorHistory` is **true** (ON mode):

- Keep current behavior: use `db.lpush()` directly and trim

### 4. Code Structure

Create a helper function to handle visitor history recording that:

- Takes the visit key, visitor object, and configuration as parameters
- Checks `configuration.recordDetailedVisitorHistory`
- Implements the appropriate logic based on the configuration value
- Handles errors appropriately

### 5. Files to Modify

1. **Configuration Files**

   - **`config/default.js`** - Add `recordDetailedVisitorHistory: false` configuration option
   - **`config/test.js`** - Add `recordDetailedVisitorHistory: false` configuration option
   - **`config/user.service.js`** - Add `recordDetailedVisitorHistory: false` configuration option as example

2. **`lib/routes/location/v1/location.js`**

   - Extract visitor history recording logic into a helper function
   - Update `getLocationHistory` to use the helper
   - Update `getLocation` to use the helper
   - The helper should check `configuration.recordDetailedVisitorHistory` and implement both modes

3. **`README.md`**

   - Add new "Visitor History Configuration" section after "Rate Limiting" section
   - Document all three visitor history configuration options
   - Include examples, use cases, and configuration snippets

### 6. Data Flow

```
Access Location → Check recordDetailedVisitorHistory config
  ├─ true:  lpush new entry → trim (current behavior)
  └─ false: lrange existing → filter by DeviceID → del → lpush filtered + new → trim
```

### 7. Edge Cases to Handle

- Empty visitor list (first visitor)
- Visitor list at max capacity
- JSON parsing errors when reading existing entries
- Redis operation errors
- Multiple concurrent accesses (handled by existing Redis operations)

### 8. Documentation

Add a new section to `README.md` titled "Visitor History Configuration" that documents all visitor history-related configuration options. This section should be placed after the "Rate Limiting" section and before the "Docker" section.

The documentation should include:

#### Configuration Options

1. **`maximumNumberOfLocationVistors`** (existing)

   - Description: Maximum number of visitor entries to store per device
   - Default: `10`
   - Type: Number
   - Note: This is +1 (starts with 0), so 10 means 11 entries max

2. **`addEmptyVisitorDeviceIDtoVisitorHistory`** (existing)

   - Description: Whether to record visitors that don't have a device ID (empty RequestMiataruDeviceID)
   - Default: `false`
   - Type: Boolean
   - When `false`: Unknown visitors (empty device ID) are not recorded
   - When `true`: All visitors are recorded, even without device IDs

3. **`recordDetailedVisitorHistory`** (new)

   - Description: Controls how visitor history entries are recorded
   - Default: `false` (OFF mode)
   - Type: Boolean
   - **When `false` (OFF mode)**: Each accessing device is only recorded once. If the same device accesses the location again, its existing entry is updated with the new timestamp and information. This mode is more storage-efficient and shows only unique visitors with their latest access time.
   - **When `true` (ON mode)**: Every access to a location is recorded as a separate history entry with a timestamp. This mode provides a complete audit trail of all accesses but uses more storage.

#### Configuration Example

```javascript
module.exports = {
    // ... other configuration
    
    // Visitor History Configuration
    maximumNumberOfLocationVistors: 10,
    addEmptyVisitorDeviceIDtoVisitorHistory: false,
    recordDetailedVisitorHistory: false  // OFF mode (default)
};
```

#### Use Cases

- **`recordDetailedVisitorHistory: false`** (Recommended for most use cases)
  - When you want to track unique visitors and their last access time
  - When storage efficiency is important
  - When you only need to know "who visited" and "when they last visited"

- **`recordDetailedVisitorHistory: true`**
  - When you need a complete audit trail of all accesses
  - When you want to analyze access patterns over time
  - When you need to track frequency of visits per device

### 9. Testing Considerations

The existing tests in `tests/integration/visitorHistoryFiltering.tests.js` should continue to work, but may need updates to test the new behavior when `recordDetailedVisitorHistory` is false.