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

var KEY_HISTORY = 'hist';
var KEY_LAST = 'last';

/**
 * GetLocationHistory
 * Retrieves the complete History
 * @param req
 * @param res
 * @param next
 */
function getLocationHistory(req, res, next) {
    var locationRequest = req.MIATARU.request;
    var key = kb.build(locationRequest.device(), KEY_HISTORY);

    seq()
        .par('listLength', function() {
            db.llen(key, this);
        })
        .par('list', function() {
            db.lrange(key, 0, locationRequest.amount()-1, this);
        })
        .seq(function() {
            res.send((new models.ResponseLocationHistory(
                this.vars.listLength,
                configuration.maximumNumberOfHistoryItems,
                this.vars.list.map(function(value) {
                    return JSON.parse(value)
                })
            )).data());
        })
        .catch(function(error) {
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

        seq()
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
        .catch(next);
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
    var response = new models.ResponseLocation();

    req.MIATARU.devices.forEach(function(device) {
        chain.par(function() {
            var done = this;

            db.get(kb.build(device.device(), KEY_LAST), function (error, reply) {
                if(error)  return done(error);

                response.pushLocation(JSON.parse(reply));
                done();
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

    req.MIATARU.devices.forEach(function(device) {
        chain.par(function() {
            var done = this;

            db.get(kb.build(device.device(), KEY_LAST), function (error, reply) {
                if(error)  return done(error);

                response.pushLocation(JSON.parse(reply));
                done();
            });
        });
    });

    chain.seq(function() {
        res.send(response.data());
    })
    .catch(next);
}

function getLocationGeoJSONGET(id, res, next) {
    var chain = seq();
    var response = new models.ResponseLocationGeoJSON();
    
    chain.par(function() {
        var done = this;
    
        db.get(kb.build(id, KEY_LAST), function (error, reply) {
            if(error)  return done(error);
            
            response.pushLocation(JSON.parse(reply));
            done();
        });
    })
              
    chain.seq(function() {
        res.send(response.data());
    }).catch(next);
}


module.exports = {
    updateLocation: updateLocation,
    getLocation: getLocation,
    getLocationGeoJSON: getLocationGeoJSON,
    getLocationGeoJSONGET: getLocationGeoJSONGET,
    getLocationHistory: getLocationHistory
};
