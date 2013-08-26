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

module.exports.install = function(app) {
    app.post('/UpdateLocation', inputParser, update);
    app.post('/GetLocation', inputParser, get);
};

function update(req, res, next) {
    var MIATARU = req.MIATARU;
    var requestConfig = MIATARU.config;
    var locations = MIATARU.locations;

    var chain = seq();

    if(requestConfig.enableLocationHistory()) {
        locations.forEach(function(loc, idx) {
            var value = JSON.stringify(loc.data());
            var deviceKey = kb.build(loc.device(), 'hist');

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
                    db.set(kb.build(loc.device(), 'last'), value, this);
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
                db.del(kb.build(loc.device(), 'hist'), this);
            })
            // update the last known location
            .par(function() {
                db.setex(kb.build(loc.device(), 'last'), timeToKeep, value, this);
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
 * @param req
 * @param res
 * @param next
 */
function get(req, res, next) {
    var chain = seq();
    var result = [];

    req.MIATARU.devices.forEach(function(device) {
        chain.par(function() {
            var done = this;

            db.get(kb.build(device.device(), 'last'), function (error, reply) {
                if(error) {
                    return done(error);
                }

                //TODO: do this via a ReturnModel
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