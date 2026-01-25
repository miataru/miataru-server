# iOS Client Adoption Guide for Miataru API 1.1

This guide provides step-by-step instructions for updating the iOS client application to support Miataru API 1.1 security features.

## Overview

API 1.1 introduces two main security features:
1. **DeviceKey** - Authentication for write operations
2. **Allowed Devices List** - Access control for location sharing

## Prerequisites

- Existing iOS client working with Miataru API 1.0
- Keychain Services access for secure DeviceKey storage
- User preferences/settings storage for DeviceKey management

## Step 1: DeviceKey Storage

### 1.1 Add Keychain Helper

Create a helper class to securely store the DeviceKey in the iOS Keychain:

```swift
import Security

class DeviceKeyManager {
    static let shared = DeviceKeyManager()
    private let service = "com.yourapp.miataru"
    private let account = "deviceKey"
    
    func saveDeviceKey(_ key: String, for deviceID: String) -> Bool {
        let data = key.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "\(account).\(deviceID)",
            kSecValueData as String: data
        ]
        
        // Delete existing key first
        SecItemDelete(query as CFDictionary)
        
        // Add new key
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func getDeviceKey(for deviceID: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "\(account).\(deviceID)",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let key = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return key
    }
    
    func deleteDeviceKey(for deviceID: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "\(account).\(deviceID)"
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
```

### 1.2 Generate Secure DeviceKey

Add a method to generate a secure random DeviceKey:

```swift
func generateDeviceKey() -> String {
    let length = 256
    let characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    var key = ""
    
    for _ in 0..<length {
        let randomIndex = Int.random(in: 0..<characters.count)
        let character = characters[characters.index(characters.startIndex, offsetBy: randomIndex)]
        key.append(character)
    }
    
    return key
}
```

## Step 2: Set DeviceKey API Call

### 2.1 Create SetDeviceKey Request

Add a method to call the `/v1/setDeviceKey` endpoint:

```swift
func setDeviceKey(deviceID: String, currentKey: String?, newKey: String, completion: @escaping (Result<Void, Error>) -> Void) {
    var requestBody: [String: Any] = [
        "MiataruSetDeviceKey": [
            "DeviceID": deviceID,
            "NewDeviceKey": newKey
        ]
    ]
    
    // Add CurrentDeviceKey only if provided (for key changes)
    if let currentKey = currentKey {
        requestBody["MiataruSetDeviceKey"]?["CurrentDeviceKey"] = currentKey
    } else {
        requestBody["MiataruSetDeviceKey"]?["CurrentDeviceKey"] = NSNull()
    }
    
    // Make API call
    makeAPICall(endpoint: "/v1/setDeviceKey", method: "POST", body: requestBody) { result in
        switch result {
        case .success(let response):
            if let miataruResponse = response["MiataruResponse"] as? String,
               miataruResponse == "ACK" {
                // Save key to keychain
                if DeviceKeyManager.shared.saveDeviceKey(newKey, for: deviceID) {
                    completion(.success(()))
                } else {
                    completion(.failure(NSError(domain: "DeviceKeyError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to save DeviceKey to keychain"])))
                }
            } else {
                completion(.failure(NSError(domain: "DeviceKeyError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response from server"])))
            }
        case .failure(let error):
            completion(.failure(error))
        }
    }
}
```

### 2.2 Initial DeviceKey Setup

Add a method to set up DeviceKey for the first time:

```swift
func setupDeviceKey(deviceID: String, completion: @escaping (Result<String, Error>) -> Void) {
    // Generate new key
    let newKey = generateDeviceKey()
    
    // Set on server (first time, no CurrentDeviceKey)
    setDeviceKey(deviceID: deviceID, currentKey: nil, newKey: newKey) { result in
        switch result {
        case .success:
            completion(.success(newKey))
        case .failure(let error):
            completion(.failure(error))
        }
    }
}
```

## Step 3: Update UpdateLocation Request

### 3.1 Modify UpdateLocation to Include DeviceKey

Update your existing UpdateLocation method to include DeviceKey when available:

```swift
func updateLocation(deviceID: String, location: Location, completion: @escaping (Result<Void, Error>) -> Void) {
    // Get DeviceKey from keychain
    let deviceKey = DeviceKeyManager.shared.getDeviceKey(for: deviceID)
    
    var locationData: [String: Any] = [
        "Device": deviceID,
        "Timestamp": String(Int(location.timestamp.timeIntervalSince1970 * 1000)),
        "Longitude": String(location.longitude),
        "Latitude": String(location.latitude),
        "HorizontalAccuracy": String(location.horizontalAccuracy)
    ]
    
    // Add DeviceKey if available (API 1.1)
    if let deviceKey = deviceKey {
        locationData["DeviceKey"] = deviceKey
    }
    
    let requestBody: [String: Any] = [
        "MiataruLocation": [locationData]
    ]
    
    makeAPICall(endpoint: "/v1/UpdateLocation", method: "POST", body: requestBody) { result in
        switch result {
        case .success(let response):
            if let miataruResponse = response["MiataruResponse"] as? String,
               miataruResponse == "ACK" {
                completion(.success(()))
            } else {
                completion(.failure(NSError(domain: "UpdateLocationError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])))
            }
        case .failure(let error):
            // Handle 403 Forbidden (DeviceKey mismatch)
            if let httpError = error as? HTTPError, httpError.statusCode == 403 {
                // DeviceKey might be invalid, prompt user to re-enter or reset
                completion(.failure(NSError(domain: "UpdateLocationError", code: 403, userInfo: [NSLocalizedDescriptionKey: "DeviceKey authentication failed"])))
            } else {
                completion(.failure(error))
            }
        }
    }
}
```

## Step 4: Update GetVisitorHistory Request

### 4.1 Modify GetVisitorHistory to Include DeviceKey

Update your GetVisitorHistory method:

```swift
func getVisitorHistory(deviceID: String, amount: Int, completion: @escaping (Result<[Visitor], Error>) -> Void) {
    // Get DeviceKey from keychain
    let deviceKey = DeviceKeyManager.shared.getDeviceKey(for: deviceID)
    
    var requestBody: [String: Any] = [
        "MiataruGetVisitorHistory": [
            "Device": deviceID,
            "Amount": String(amount)
        ]
    ]
    
    // Add DeviceKey if available (API 1.1)
    if let deviceKey = deviceKey {
        requestBody["MiataruGetVisitorHistory"]?["DeviceKey"] = deviceKey
    }
    
    makeAPICall(endpoint: "/v1/GetVisitorHistory", method: "POST", body: requestBody) { result in
        switch result {
        case .success(let response):
            // Parse visitor history
            // ...
            completion(.success(visitors))
        case .failure(let error):
            // Handle 403 Forbidden
            if let httpError = error as? HTTPError, httpError.statusCode == 403 {
                completion(.failure(NSError(domain: "GetVisitorHistoryError", code: 403, userInfo: [NSLocalizedDescriptionKey: "DeviceKey authentication failed"])))
            } else {
                completion(.failure(error))
            }
        }
    }
}
```

## Step 5: Allowed Devices List Management

### 5.1 Create AllowedDevice Model

```swift
struct AllowedDevice: Codable {
    let deviceID: String
    let hasCurrentLocationAccess: Bool
    let hasHistoryAccess: Bool
    
    enum CodingKeys: String, CodingKey {
        case deviceID = "DeviceID"
        case hasCurrentLocationAccess
        case hasHistoryAccess
    }
}
```

### 5.2 Set Allowed Devices List

```swift
func setAllowedDevicesList(deviceID: String, allowedDevices: [AllowedDevice], completion: @escaping (Result<Void, Error>) -> Void) {
    // Get DeviceKey from keychain
    guard let deviceKey = DeviceKeyManager.shared.getDeviceKey(for: deviceID) else {
        completion(.failure(NSError(domain: "AllowedDevicesError", code: -1, userInfo: [NSLocalizedDescriptionKey: "DeviceKey not found"])))
        return
    }
    
    let allowedDevicesArray = allowedDevices.map { device -> [String: Any] in
        return [
            "DeviceID": device.deviceID,
            "hasCurrentLocationAccess": device.hasCurrentLocationAccess,
            "hasHistoryAccess": device.hasHistoryAccess
        ]
    }
    
    let requestBody: [String: Any] = [
        "MiataruSetAllowedDeviceList": [
            "DeviceID": deviceID,
            "DeviceKey": deviceKey,
            "allowedDevices": allowedDevicesArray
        ]
    ]
    
    makeAPICall(endpoint: "/v1/setAllowedDeviceList", method: "POST", body: requestBody) { result in
        switch result {
        case .success(let response):
            if let miataruResponse = response["MiataruResponse"] as? String,
               miataruResponse == "ACK" {
                completion(.success(()))
            } else {
                completion(.failure(NSError(domain: "AllowedDevicesError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])))
            }
        case .failure(let error):
            if let httpError = error as? HTTPError, httpError.statusCode == 403 {
                completion(.failure(NSError(domain: "AllowedDevicesError", code: 403, userInfo: [NSLocalizedDescriptionKey: "DeviceKey authentication failed"])))
            } else {
                completion(.failure(error))
            }
        }
    }
}
```

## Step 6: User Interface Updates

### 6.1 DeviceKey Setup Screen

Create a settings screen where users can:
- Enable/disable DeviceKey protection
- View DeviceKey status
- Change DeviceKey (requires current key)
- Reset DeviceKey (requires server-side support or user confirmation)

### 6.2 Allowed Devices Management Screen

Create a screen to manage allowed devices:
- List of allowed devices
- Add/remove devices
- Toggle currentLocation and history access per device
- Show device names/identifiers

## Step 7: Error Handling

### 7.1 Handle 403 Forbidden Errors

Add proper error handling for DeviceKey authentication failures:

```swift
func handleDeviceKeyError(error: Error, deviceID: String, completion: @escaping (Bool) -> Void) {
    if let httpError = error as? HTTPError, httpError.statusCode == 403 {
        // Show alert to user
        let alert = UIAlertController(
            title: "Authentication Failed",
            message: "DeviceKey authentication failed. Would you like to reset your DeviceKey?",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Reset", style: .destructive) { _ in
            // Reset DeviceKey flow
            self.resetDeviceKey(deviceID: deviceID) { result in
                completion(result)
            }
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in
            completion(false)
        })
        
        // Present alert
        // ...
    } else {
        completion(false)
    }
}
```

### 7.2 Handle 401 Unauthorized for GetLocationGeoJSON

If your app uses GetLocationGeoJSON, handle the 401 error:

```swift
func getLocationGeoJSON(deviceID: String, completion: @escaping (Result<GeoJSON, Error>) -> Void) {
    makeAPICall(endpoint: "/v1/GetLocationGeoJSON/\(deviceID)", method: "GET", body: nil) { result in
        switch result {
        case .success(let response):
            // Parse GeoJSON
            completion(.success(geoJSON))
        case .failure(let error):
            if let httpError = error as? HTTPError, httpError.statusCode == 401 {
                // DeviceKey is set, use GetLocation POST endpoint instead
                self.getLocation(deviceID: deviceID) { locationResult in
                    // Convert location to GeoJSON format
                    // ...
                }
            } else {
                completion(.failure(error))
            }
        }
    }
}
```

## Step 8: Migration Strategy

### 8.1 Gradual Rollout

1. **Phase 1**: Deploy app update with DeviceKey support (optional feature)
2. **Phase 2**: Prompt users to enable DeviceKey protection
3. **Phase 3**: Make DeviceKey recommended for new devices
4. **Phase 4**: (Optional) Make DeviceKey required for new devices

### 8.2 Backward Compatibility

- Always check if DeviceKey exists before including it in requests
- Handle cases where DeviceKey is not set (backward compatible)
- Don't break existing functionality for users who haven't enabled DeviceKey

## Step 9: Testing Checklist

- [ ] DeviceKey generation and storage
- [ ] Set DeviceKey API call (first time)
- [ ] Change DeviceKey API call
- [ ] UpdateLocation with DeviceKey
- [ ] UpdateLocation without DeviceKey (backward compatible)
- [ ] GetVisitorHistory with DeviceKey
- [ ] GetVisitorHistory without DeviceKey (backward compatible)
- [ ] Error handling for 403 Forbidden
- [ ] Error handling for 401 Unauthorized (GetLocationGeoJSON)
- [ ] Set allowed devices list
- [ ] GetLocation with allowed devices
- [ ] GetLocationHistory with allowed devices
- [ ] Access denied scenarios
- [ ] Keychain storage and retrieval
- [ ] User interface for DeviceKey management
- [ ] User interface for allowed devices management

## Step 10: Deployment

1. **Test thoroughly** with both API 1.0 and 1.1 scenarios
2. **Monitor error rates** for 403/401 responses
3. **Provide user documentation** on DeviceKey and privacy features
4. **Support users** who need help with DeviceKey setup
5. **Monitor server logs** for authentication failures

## Additional Notes

- DeviceKey should be stored securely in Keychain, never in UserDefaults or plain text
- Consider implementing DeviceKey recovery mechanism (e.g., server-side reset with user verification)
- Provide clear user messaging about privacy benefits of DeviceKey
- Test with various network conditions and error scenarios
- Consider implementing retry logic for transient network errors
