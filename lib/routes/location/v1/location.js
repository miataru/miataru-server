/*
	UpdateLocation POST

	By doing a HTTP Post on the /UpdateLocation method of this server you should
	be able to trigger this method here.

	curl -H "Content-Type: application/json" -X POST http://localhost:3000/UpdateLocation -d '{"JSON": "HERE"}'

	curl -H "Content-Type: application/json" -X POST http://localhost:3000/UpdateLocation -d '{"MiataruConfig":{"EnableLocationHistory":"Fa":"15"},"MiataruLocation":[{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823","Timestamp":"1376735651302","Longitude":"10.837502","Latitude":"49.828925","HorizontalAccuracy":"50.00"}]}'

	To store information Redis is used. The naming conventions are as follows:

	Last Known Location (expiring key-value): miad:$deviceid:last
	Location History (non expiring list): miad:$deviceid:hist
 */

var seq = require('seq');

var configuration = require('../../../configuration');
var db = require('../../../db');
var kb = require('../../../utils/keyBuilder');
var models = require('../../../models');
var errors = require('../../../errors');
var logger = require('../../../logger');
var deviceKeyUtils = require('../../../utils/deviceKey');
var allowedDevicesUtils = require('../../../utils/allowedDevices');

var KEY_HISTORY = 'hist';
var KEY_LAST = 'last';
var KEY_VISIT = 'visit';

/**
 * Record visitor history entry
 * Handles both detailed (every access) and non-detailed (update existing) modes
 * Executes the operation asynchronously (fire-and-forget)
 * @param {string} visitKey - Redis key for visitor history
 * @param {string} visitValue - JSON stringified visitor object
 */
function recordVisitorHistory(visitKey, visitValue) {
    if (configuration.recordDetailedVisitorHistory === true) {
        // ON mode: record every access as separate entry (current behavior)
        seq()
            .seq(function() {
                db.lpush(visitKey, visitValue, this);
            })
            .seq(function() {
                db.ltrim(visitKey, 0, configuration.maximumNumberOfLocationVistors-1, this);
            })
            .catch(function(error) {
                logger.warn('Error recording visitor history: %s', error.message);
            });
    } else {
        // OFF mode: keep only the newest entry per device, limit applies to unique devices
        seq()
            .seq(function() {
                var done = this;
                // Read ALL existing visitor entries (not limited) to find all devices
                db.lrange(visitKey, 0, -1, function(error, list) {
                    if (error) return done(error);
                    
                    var newVisitor;
                    try {
                        newVisitor = JSON.parse(visitValue);
                    } catch (parseError) {
                        return done(parseError);
                    }
                    
                    // Map to store the newest entry per DeviceID
                    var deviceMap = {};
                    
                    // Parse all existing entries and keep only the newest per device
                    if (list && list.length > 0) {
                        list.forEach(function(value) {
                            if (value === null || value === undefined) {
                                return;
                            }
                            
                            var serialized = value;
                            if (Buffer.isBuffer(value)) {
                                serialized = value.toString();
                            }
                            
                            try {
                                var visitor = JSON.parse(serialized);
                                var deviceID = visitor.DeviceID;
                                
                                // If we haven't seen this device, or this entry is newer, keep it
                                if (!deviceMap[deviceID] || (visitor.TimeStamp || 0) > (deviceMap[deviceID].TimeStamp || 0)) {
                                    deviceMap[deviceID] = visitor;
                                }
                            } catch (parseError) {
                                // Skip invalid entries
                                logger.warn('Skipped invalid visitor history entry: %s', parseError.message);
                            }
                        });
                    }
                    
                    // Add/update the new visitor entry (will be the newest for its DeviceID)
                    deviceMap[newVisitor.DeviceID] = newVisitor;
                    
                    // Convert map to array and sort by timestamp (newest first)
                    var visitorsToAdd = [];
                    for (var deviceID in deviceMap) {
                        if (deviceMap.hasOwnProperty(deviceID)) {
                            visitorsToAdd.push(JSON.stringify(deviceMap[deviceID]));
                        }
                    }
                    
                    visitorsToAdd.sort(function(a, b) {
                        try {
                            var visitorA = JSON.parse(a);
                            var visitorB = JSON.parse(b);
                            var timeA = visitorA.TimeStamp || 0;
                            var timeB = visitorB.TimeStamp || 0;
                            // Sort descending (newest first)
                            return timeB - timeA;
                        } catch (parseError) {
                            // If parsing fails, maintain original order
                            return 0;
                        }
                    });
                    
                    // Apply limit to number of unique devices (not total entries)
                    // Since we only have one entry per device, this is the device limit
                    if (visitorsToAdd.length > configuration.maximumNumberOfLocationVistors) {
                        visitorsToAdd = visitorsToAdd.slice(0, configuration.maximumNumberOfLocationVistors);
                    }
                    
                    // Store visitors to add in vars for next step
                    done.vars = done.vars || {};
                    done.vars.visitorsToAdd = visitorsToAdd;
                    done();
                });
            })
            .seq(function() {
                var done = this;
                // Delete the existing list
                db.del(visitKey, function(error) {
                    if (error) return done(error);
                    done();
                });
            })
            .seq(function() {
                var done = this;
                var visitorsToAdd = (done.vars || {}).visitorsToAdd || [];
                
                // Re-add all visitors (sorted by timestamp, newest first)
                if (visitorsToAdd.length === 0) {
                    // No visitors to add, we're done
                    done();
                    return;
                }
                
                // Add all visitors back sequentially
                // Since lpush adds to the head, we need to push in reverse order
                // to maintain newest-first ordering
                var addNext = function(index) {
                    if (index < 0) {
                        // All visitors added (pushed in reverse), we're done
                        // No need to trim since we already limited to maximumNumberOfLocationVistors
                        done();
                        return;
                    }
                    
                    db.lpush(visitKey, visitorsToAdd[index], function(error) {
                        if (error) return done(error);
                        addNext(index - 1);
                    });
                };
                
                // Start from the last item (oldest) and work backwards
                // This ensures newest ends up at the top after all lpush operations
                addNext(visitorsToAdd.length - 1);
            })
            .catch(function(error) {
                logger.warn('Error recording visitor history: %s', error.message);
            });
    }
}

function validateRequestingDeviceKeyForGetLocation(requestConfig, callback) {
    if (configuration.strictDeviceKeyCheck === false) {
        return callback();
    }

    var requestingDeviceId = requestConfig.requestMiataruDeviceID();
    var requestingDeviceKey = requestConfig.requestMiataruDeviceKey();

    // Let existing RequestMiataruDeviceID validation path handle missing IDs.
    if (!requestingDeviceId || requestingDeviceId === '') {
        return callback();
    }

    deviceKeyUtils.getDeviceKey(requestingDeviceId, function(error, storedKey) {
        if (error) {
            return callback(error);
        }

        // If requesting device has no configured key, continue as before.
        if (storedKey === null || storedKey === undefined) {
            return callback();
        }

        deviceKeyUtils.validateDeviceKey(requestingDeviceId, requestingDeviceKey, function(validationError, isValid) {
            if (validationError) {
                return callback(validationError);
            }

            if (!isValid) {
                return callback(new errors.ForbiddenError('RequestMiataruDeviceKey does not match (strictDeviceKeyCheck is enabled)'));
            }

            callback();
        });
    });
}

/**
 * GetLocationHistory
 * Retrieves the complete History
 * @param req
 * @param res
 * @param next
 */
function getLocationHistory(req, res, next) {
    var locationRequest = req.MIATARU.request;
    var requestConfig = req.MIATARU.config;
    var targetDeviceId = locationRequest.device();
    var requestingDeviceId = requestConfig.requestMiataruDeviceID();
    var key = kb.build(targetDeviceId, KEY_HISTORY);

    seq()
        .seq(function() {
            var done = this;
            // Check if allowed devices list is enabled and if requesting device has access
            allowedDevicesUtils.checkAccess(
                targetDeviceId,
                requestingDeviceId,
                allowedDevicesUtils.ACCESS_TYPE_HISTORY,
                function(error, hasAccess) {
                    if (error) {
                        return done(error);
                    }

                    // If access is denied, return empty history (as if history doesn't exist)
                    if (!hasAccess) {
                        done.vars = done.vars || {};
                        done.vars.listLength = 0;
                        done.vars.list = [];
                        return done();
                    }

                    // Access granted, proceed to get history
                    done();
                }
            );
        })
        .par('listLength', function() {
            var done = this;
            // If we already set listLength (access denied), use that value
            if (done.vars && done.vars.listLength !== undefined) {
                return done(null, done.vars.listLength);
            }
            // Otherwise, get from Redis
            db.llen(key, done);
        })
        .seq(function() {
            var done = this;
            var vars = done.vars = done.vars || {};
            var available = Number(vars.listLength) || 0;
            var requested = Number(locationRequest.amount());

            // If we already have an empty list (access denied), skip fetching
            if (vars.list && vars.list.length === 0 && available === 0) {
                return done();
            }

            if (!isFinite(requested) || requested <= 0) {
                vars.list = [];
                return done();
            }

            var toFetch = Math.min(requested, available);

            if (toFetch <= 0) {
                vars.list = [];
                return done();
            }

            db.lrange(key, 0, toFetch - 1, function(error, list) {
                if (error) {
                    return done(error);
                }

                vars.list = list || [];
                done();
            });
        })
        .seq(function() {

            // only if this device is existing we update the visitor list...
            if (this.vars.listLength != 0)
            {
              // store the visitor for this device (if it's not empty)...
              var visitKey = kb.build(locationRequest.device(), KEY_VISIT);
              var miataruVisitorObject = requestConfig.requestMiataruVisitorObject(locationRequest.device());
              // only if the object is not null (= we do not want to store the visitor history of unknown devices)
              if (miataruVisitorObject != null)
              {
                  var visitValue = JSON.stringify(miataruVisitorObject);
                  // record visitor history using helper function (handles both detailed and non-detailed modes)
                  recordVisitorHistory(visitKey, visitValue);
              }
            }

            var parsedList = [];
            var invalidEntries = 0;

            (this.vars.list || []).forEach(function(value) {
                if (value === null || value === undefined) {
                    invalidEntries++;
                    return;
                }

                var serialized = value;

                if (Buffer.isBuffer(value)) {
                    serialized = value.toString();
                }

                try {
                    parsedList.push(JSON.parse(serialized));
                } catch (parseError) {
                    invalidEntries++;
                }
            });

            if (invalidEntries > 0) {
                logger.warn('Skipped %d invalid location history entr%s for device %s', invalidEntries, invalidEntries === 1 ? 'y' : 'ies', locationRequest.device());
            }

            var listLength = Number(this.vars.listLength);

            if (!isFinite(listLength) || listLength < 0) {
                listLength = 0;
            }

            res.json((new models.ResponseLocationHistory(
                listLength,
                configuration.maximumNumberOfHistoryItems,
                parsedList
            )).data());
        })
        .catch(function(error) {
            // If error is already a proper error type (BadRequestError, etc.), pass it through
            if (error && error.statusCode) {
                return next(error);
            }
            // Otherwise, wrap in InternalServerError
            next(new errors.InternalServerError(error));
        });
}

/**
 * UpdateLocation
 * api endpoint that updates the currentLocation and a arbitrary number of history locations
 *
 * @param req
 * @param res
 * @param next
 */
function updateLocation(req, res, next) {
    var MIATARU = req.MIATARU;
    var requestConfig = MIATARU.config;
    var locations = MIATARU.locations;

    var chain = seq();

    // Validate DeviceKey for each location if DeviceKey is set for the device
    locations.forEach(function(loc, idx) {
        var deviceId = loc.device();
        var providedDeviceKey = loc.deviceKey();

        chain.seq(function() {
            var done = this;
            // Check if DeviceKey is set for this device
            deviceKeyUtils.getDeviceKey(deviceId, function(error, storedKey) {
                if (error) {
                    return done(error);
                }

                // If DeviceKey is set for this device, validate provided key
                if (storedKey !== null && storedKey !== undefined) {
                    // DeviceKey is required when it's set
                    if (!providedDeviceKey || providedDeviceKey === null || providedDeviceKey === '') {
                        return done(new errors.ForbiddenError('DeviceKey is required for this device'));
                    }

                    // Validate provided key matches stored key
                    deviceKeyUtils.validateDeviceKey(deviceId, providedDeviceKey, function(error2, isValid) {
                        if (error2) {
                            return done(error2);
                        }

                        if (!isValid) {
                            return done(new errors.ForbiddenError('DeviceKey does not match'));
                        }

                        done();
                    });
                } else {
                    // No DeviceKey set, proceed normally (backward compatible)
                    done();
                }
            });
        });
    });

    if(requestConfig.enableLocationHistory()) {
        locations.forEach(function(loc, idx) {
            var value = JSON.stringify(loc.data());
            var historyKey = kb.build(loc.device(), KEY_HISTORY);
            var lastKey = kb.build(loc.device(), KEY_LAST);

            chain
                // we do want to store location history, so check if we got, so lpush and trim
                .seq(function() {
                    db.lpush(historyKey, value, this);
                })
                // take care that the location history does not grow beyond the set range of maximumNumberOfHistoryItems
                .seq(function() {
                    db.ltrim(historyKey, 0, configuration.maximumNumberOfHistoryItems-1, this);
                });

            if(idx === locations.length - 1) {
                // finally also update the last known location...
                chain.seq(function() {
                    db.set(lastKey, value, this);
                });
            }
        });
    } else {
        //we're only interested in the last item as we're not saving a history
        var loc = locations[locations.length-1];

        var timeToKeep = requestConfig.locationDataRetentionTime() * 60;
        var value = JSON.stringify(loc.data());

        chain
            // we do not want to save a location history, this means if there's one we delete it...
            .par(function() {
                db.del(kb.build(loc.device(), KEY_HISTORY), this);
            })
            // update the last known location
            .par(function() {
                db.setex(kb.build(loc.device(), KEY_LAST), timeToKeep, value, this);
            });
    }

    chain
        .seq(function() {
            var eyes = ['x', '!', '^', '°'];
            res.send((new models.ResponseUpdateLocation(eyes[parseInt(Math.random() * eyes.length, 10)])).data());
        })
        .catch(function(error) {
            if (error instanceof errors.ForbiddenError) {
                return next(error);
            }
            next(error);
        });
}

/**
 * GetLocation
 * This is used to get the current location of a device.
 *
 * @param req
 * @param res
 * @param next
 */
function getLocation(req, res, next) {
    var chain = seq();
    var requestConfig = req.MIATARU.config;
    var requestingDeviceId = requestConfig.requestMiataruDeviceID();
    var response = new models.ResponseLocation();

    chain.seq(function() {
        var done = this;
        validateRequestingDeviceKeyForGetLocation(requestConfig, done);
    });

    req.MIATARU.devices.forEach(function(device) {
        chain.par(function() {
            var done = this;
            var targetDeviceId = device.device();

            // First, check if device exists and get location data
            db.get(kb.build(targetDeviceId, KEY_LAST), function (error1, reply) {
                if (error1) return done(error1);

                // If device exists, record visitor (regardless of access)
                if (reply != null) {
                    var visitKey = kb.build(targetDeviceId, KEY_VISIT);
                    var miataruVisitorObject = requestConfig.requestMiataruVisitorObject(targetDeviceId);
                    // only if the object is not null (= we do not want to store the visitor history of unknown devices)
                    if (miataruVisitorObject != null) {
                        var visitValue = JSON.stringify(miataruVisitorObject);
                        // record visitor history using helper function (handles both detailed and non-detailed modes)
                        recordVisitorHistory(visitKey, visitValue);
                    }
                }

                // Now check access control
                allowedDevicesUtils.checkAccess(
                    targetDeviceId,
                    requestingDeviceId,
                    allowedDevicesUtils.ACCESS_TYPE_CURRENT_LOCATION,
                    function(error2, hasAccess) {
                        if (error2) {
                            return done(error2);
                        }

                        // If access is denied, return as if device doesn't exist
                        if (!hasAccess) {
                            response.pushLocation(null);
                            return done();
                        }

                        // Access granted, return location data
                        if (reply != null) {
                            try {
                                response.pushLocation(JSON.parse(reply));
                            } catch (parseError) {
                                return done(new errors.InternalServerError('Invalid location data format'));
                            }
                        } else {
                            response.pushLocation(null);
                        }
                        done();
                    }
                );
            });
        });
    });

    chain.seq(function() {
        res.send(response.data());
    })
    .catch(next);
}

/**
 * GetLocationGeoJSON
 * This is used to get the current location of a device encoded as GeoJSON
 *
 * @param req
 * @param res
 * @param next
 */
function getLocationGeoJSON(req, res, next) {
    var chain = seq();
    var response = new models.ResponseLocationGeoJSON();

    // Check if DeviceKey is set for any requested device
    req.MIATARU.devices.forEach(function(device) {
        chain.seq(function() {
            var done = this;
            var deviceId = device.device();

            deviceKeyUtils.getDeviceKey(deviceId, function(error, storedKey) {
                if (error) {
                    return done(error);
                }

                // If DeviceKey is set, return 401 Unauthorized
                if (storedKey !== null && storedKey !== undefined) {
                    return done(new errors.UnauthorizedError('GetLocationGeoJSON is not available when DeviceKey is set'));
                }

                done();
            });
        });
    });

    req.MIATARU.devices.forEach(function(device) {
        chain.par(function() {
            var done = this;

            db.get(kb.build(device.device(), KEY_LAST), function (error, reply) {
                if(error)  return done(error);

                if (reply != null) {
                    try {
                        response.pushLocation(JSON.parse(reply));
                    } catch (parseError) {
                        return done(new errors.InternalServerError('Invalid location data format'));
                    }
                } else {
                    response.pushLocation(null);
                }
                done();
            });
        });
    });

    chain.seq(function() {
        res.send(response.data());
    })
    .catch(function(error) {
        if (error instanceof errors.UnauthorizedError) {
            return next(error);
        }
        next(error);
    });
}

/**
 * GetLocationGeoJSONGET
 * This is used to get the current location of a device encoded as GeoJSON, but this time as a one-shot request for just one device
 * @param req
 * @param res
 * @param next
 */
function getLocationGeoJSONGET(id, res, next) {
    var chain = seq();
    var response = new models.ResponseLocationGeoJSON();

    chain.seq(function() {
        var done = this;

        // Check if DeviceKey is set for this device
        deviceKeyUtils.getDeviceKey(id, function(error, storedKey) {
            if (error) {
                return done(error);
            }

            // If DeviceKey is set, return 401 Unauthorized
            if (storedKey !== null && storedKey !== undefined) {
                return done(new errors.UnauthorizedError('GetLocationGeoJSON is not available when DeviceKey is set'));
            }

            done();
        });
    });

    chain.par(function() {
        var done = this;

        db.get(kb.build(id, KEY_LAST), function (error, reply) {
            if(error)  return done(error);

            if (reply != null) {
                try {
                    response.pushLocation(JSON.parse(reply));
                } catch (parseError) {
                    return done(new errors.InternalServerError('Invalid location data format'));
                }
            } else {
                response.pushLocation(null);
            }
            done();
        });
    })

    chain.seq(function() {
        res.send(response.data());
    }).catch(function(error) {
        if (next) {
            if (error instanceof errors.UnauthorizedError) {
                return next(error);
            }
            return next(error);
        } else {
            // Handle error directly if next is not provided (GET route handler)
            var statusCode = (error && typeof error.statusCode === 'number') ? error.statusCode : 500;
            var errorMessage = error && error.message ? error.message : 'Internal Server Error';
            res.status(statusCode).json({error: errorMessage});
        }
    });
}

/**
 * GetVisitorHistory
 * Retrieves the complete visitor history
 * @param req
 * @param res
 * @param next
 */
function getVisitorHistory(req, res, next) {
    var locationRequest = req.MIATARU.request;
    var deviceId = locationRequest.device();
    var providedDeviceKey = locationRequest.deviceKey();
    var key = kb.build(deviceId, KEY_VISIT);

    seq()
        .seq(function() {
            var done = this;
            // Check if DeviceKey is set for this device
            deviceKeyUtils.getDeviceKey(deviceId, function(error, storedKey) {
                if (error) {
                    return done(error);
                }

                // If DeviceKey is set for this device, validate provided key
                if (storedKey !== null && storedKey !== undefined) {
                    // DeviceKey is required when it's set
                    if (!providedDeviceKey || providedDeviceKey === null || providedDeviceKey === '') {
                        return done(new errors.ForbiddenError('DeviceKey is required for this device'));
                    }

                    // Validate provided key matches stored key
                    deviceKeyUtils.validateDeviceKey(deviceId, providedDeviceKey, function(error2, isValid) {
                        if (error2) {
                            return done(error2);
                        }

                        if (!isValid) {
                            return done(new errors.ForbiddenError('DeviceKey does not match'));
                        }

                        done();
                    });
                } else {
                    // No DeviceKey set, proceed normally (backward compatible)
                    done();
                }
            });
        })
        .par('listLength', function() {
            db.llen(key, this);
        })
        .seq(function() {
            var done = this;
            var vars = done.vars = done.vars || {};
            var available = Number(vars.listLength) || 0;
            var requested = Number(locationRequest.amount());

            if (!isFinite(requested) || requested <= 0) {
                vars.list = [];
                return done();
            }

            var toFetch = Math.min(requested, available);

            if (toFetch <= 0) {
                vars.list = [];
                return done();
            }

            db.lrange(key, 0, toFetch - 1, function(error, list) {
                if (error) {
                    return done(error);
                }

                vars.list = list || [];
                done();
            });
        })
        .seq(function() {

            try {
                var targetDeviceID = locationRequest.device();
                var parsedList = (this.vars.list || []).map(function(value) {
                    return JSON.parse(value);
                }).filter(function(visitor) {
                    // Filter out entries where visitor DeviceID equals the requested deviceID
                    return visitor.DeviceID !== targetDeviceID;
                });

                // Recalculate the filtered list length for the response
                var filteredListLength = parsedList.length;

                res.send((new models.ResponseVisitorHistory(
                    filteredListLength,
                    configuration.maximumNumberOfLocationVistors,
                    parsedList
                )).data());
            } catch (parseError) {
                next(new errors.InternalServerError('Invalid visitor history data format'));
            }
        })
        .catch(function(error) {
            if (error instanceof errors.ForbiddenError) {
                return next(error);
            }
            next(new errors.InternalServerError(error));
        });
}

/**
 * DeleteLocation
 * Deletes all location data (current and historical) for a device
 * @param req
 * @param res
 * @param next
 */
function deleteLocation(req, res, next) {
    var locationRequest = req.MIATARU.request;
    var deviceId = locationRequest.device();
    var providedDeviceKey = locationRequest.deviceKey();
    
    var lastKey = kb.build(deviceId, KEY_LAST);
    var historyKey = kb.build(deviceId, KEY_HISTORY);
    var visitKey = kb.build(deviceId, KEY_VISIT);
    
    var deletedCount = 0;

    seq()
        // Validate DeviceKey if DeviceKey is set for the device
        .seq(function() {
            var done = this;
            // Check if DeviceKey is set for this device
            deviceKeyUtils.getDeviceKey(deviceId, function(error, storedKey) {
                if (error) {
                    return done(error);
                }

                // If DeviceKey is set for this device, validate provided key
                if (storedKey !== null && storedKey !== undefined) {
                    // DeviceKey is required when it's set
                    if (!providedDeviceKey || providedDeviceKey === null || providedDeviceKey === '') {
                        return done(new errors.ForbiddenError('DeviceKey is required for this device'));
                    }

                    // Validate provided key matches stored key
                    deviceKeyUtils.validateDeviceKey(deviceId, providedDeviceKey, function(error2, isValid) {
                        if (error2) {
                            return done(error2);
                        }

                        if (!isValid) {
                            return done(new errors.ForbiddenError('DeviceKey does not match'));
                        }

                        done();
                    });
                } else {
                    // No DeviceKey set, proceed normally (backward compatible)
                    done();
                }
            });
        })
        // Delete last known location
        .par(function() {
            var done = this;
            db.del(lastKey, function(error, reply) {
                if (error) return done(error);
                if (reply > 0) deletedCount++;
                done();
            });
        })
        // Delete location history
        .par(function() {
            var done = this;
            db.del(historyKey, function(error, reply) {
                if (error) return done(error);
                if (reply > 0) deletedCount++;
                done();
            });
        })
        // Delete visitor history
        .par(function() {
            var done = this;
            db.del(visitKey, function(error, reply) {
                if (error) return done(error);
                if (reply > 0) deletedCount++;
                done();
            });
        })
        .seq(function() {
            res.send((new models.ResponseDeleteLocation(deviceId, deletedCount)).data());
        })
        .catch(function(error) {
            if (error instanceof errors.ForbiddenError) {
                return next(error);
            }
            next(new errors.InternalServerError(error));
        });
}

/**
 * SetDeviceKey
 * Sets or changes the device key for a device
 * @param req
 * @param res
 * @param next
 */
function setDeviceKey(req, res, next) {
    var request = req.MIATARU.request;
    var deviceId = request.deviceId();
    var currentDeviceKey = request.currentDeviceKey();
    var newDeviceKey = request.newDeviceKey();

    seq()
        .seq(function() {
            var done = this;
            // Check if device already has a key set
            deviceKeyUtils.getDeviceKey(deviceId, function(error, storedKey) {
                if (error) {
                    return done(error);
                }

                done.vars = done.vars || {};
                done.vars.storedKey = storedKey;
                done();
            });
        })
        .seq(function() {
            var done = this;
            var storedKey = (done.vars || {}).storedKey;

            // If a key exists, validate CurrentDeviceKey
            if (storedKey !== null && storedKey !== undefined) {
                // Key exists, so CurrentDeviceKey must be provided and match
                if (!currentDeviceKey || currentDeviceKey === null || currentDeviceKey === '') {
                    return done(new errors.ForbiddenError('CurrentDeviceKey is required to change existing key'));
                }

                // Validate CurrentDeviceKey matches stored key
                deviceKeyUtils.validateDeviceKey(deviceId, currentDeviceKey, function(error, isValid) {
                    if (error) {
                        return done(error);
                    }

                    if (!isValid) {
                        return done(new errors.ForbiddenError('CurrentDeviceKey does not match'));
                    }

                    done();
                });
            } else {
                // No key exists, so CurrentDeviceKey should be null/empty (first-time setup)
                // This is allowed, proceed
                done();
            }
        })
        .seq(function() {
            var done = this;
            // Set the new key
            deviceKeyUtils.setDeviceKey(deviceId, newDeviceKey, function(error) {
                if (error) {
                    return done(error);
                }

                done();
            });
        })
        .seq(function() {
            res.send((new models.ResponseSetDeviceKey()).data());
        })
        .catch(function(error) {
            if (error instanceof errors.ForbiddenError) {
                return next(error);
            }
            next(new errors.InternalServerError(error));
        });
}

/**
 * SetAllowedDeviceList
 * Sets or updates the allowed devices list for a device
 * @param req
 * @param res
 * @param next
 */
function setAllowedDeviceList(req, res, next) {
    var request = req.MIATARU.request;
    var deviceId = request.deviceId();
    var deviceKey = request.deviceKey();
    var allowedDevices = request.allowedDevices();

    seq()
        .seq(function() {
            var done = this;
            // Validate DeviceKey first
            deviceKeyUtils.validateDeviceKey(deviceId, deviceKey, function(error, isValid) {
                if (error) {
                    return done(error);
                }

                if (!isValid) {
                    return done(new errors.ForbiddenError('DeviceKey does not match'));
                }

                done();
            });
        })
        .seq(function() {
            var done = this;
            // Set the allowed devices list
            allowedDevicesUtils.setAllowedDevices(deviceId, allowedDevices, function(error) {
                if (error) {
                    return done(error);
                }

                done();
            });
        })
        .seq(function() {
            res.send((new models.ResponseSetAllowedDeviceList()).data());
        })
        .catch(function(error) {
            if (error instanceof errors.ForbiddenError) {
                return next(error);
            }
            next(new errors.InternalServerError(error));
        });
}


module.exports = {
    updateLocation: updateLocation,
    getLocation: getLocation,
    getLocationGeoJSON: getLocationGeoJSON,
    getLocationGeoJSONGET: getLocationGeoJSONGET,
    getLocationHistory: getLocationHistory,
    getVisitorHistory: getVisitorHistory,
    deleteLocation: deleteLocation,
    setDeviceKey: setDeviceKey,
    setAllowedDeviceList: setAllowedDeviceList
};
