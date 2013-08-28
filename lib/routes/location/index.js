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

var configuration = require('../../configuration');
var db = require('../../db');

var inputParser = require('./inputParser');
var kb = require('../../utils/keyBuilder');

var KEY_HISTORY = 'hist';
var KEY_LAST = 'last';

module.exports.install = function(app) {
    app.post('/UpdateLocation', inputParser, updateLocation);
    app.post('/GetLocation', inputParser, getLocation);
    app.post('/GetLocationHistory', inputParser, getLocationHistory)
};

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

    var listLength;
    seq()
        .seq(function() {
            var done = this;
            db.llen(key, function(error, retrievedListLength) {
                if (error) return done(new errors.InternalServerError(error));

                listLength = retrievedListLength;
                done();
            });
        })
        .seq(function() {
            var done = this;
            db.lrange(key, locationRequest.amount() * -1, -1, function(error, result) {
                if(error) return done(new errors.InternalServerError(error));

                //TODO: this should be done via a response model
                var response = {
                    MiataruServerConfig: {
                        MaximumNumberOfLocationUpdates: listLength
                    },
                    MiataruLocation: result
                };

                res.send(response);
            });
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
            var deviceKey = kb.build(loc.device(), KEY_HISTORY);

            chain
                // we do want to store location history, so check if we got, so lpush and trim
                .seq(function() {
                    db.lpush(deviceKey, value, this);
                })
                // take care that the location history does not grow beyond the set range of maximumNumberOfHistoryItems
                .seq(function() {
                    db.ltrim(deviceKey, 0, configuration.maximumNumberOfHistoryItems, this);
                });

            if(idx === locations.length - 1) {
                // finally also update the last known location...
                chain.seq(function() {
                    db.set(kb.build(loc.device(), KEY_LAST), value, this);
                });
            }
        });
    } else {
        //we're only interested in the first item as we're not saving a history
        var loc = locations[0];

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
            res.send({ "MiataruFishResponse": "The API documentation does not speficy the Response of a UpdateLocationRequest, so here's a fish for you: ><)))°>" });
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
    var result = [];

    req.MIATARU.devices.forEach(function(device) {
        chain.par(function() {
            var done = this;

            db.get(kb.build(device.device(), KEY_LAST), function (error, reply) {
                if(error) {
                    return done(error);
                }

                //TODO: this should be done via a response model
                result.push(JSON.parse(reply));
                done();
            });
        });
    });

    chain.seq(function() {
        //TODO: use a more generalized way to output data
        res.send({ "MiataruLocation": result });
    });

    chain.catch(next);
}