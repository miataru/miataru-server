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

// redis
var redis = require('redis'),
	db = redis.createClient(null, null, {detect_buffers: true});
	
var maximum_number_of_history_items = 1023, // keep in mind that this is +1 (starts with 0)
    redis_miataru_namespace= "miad";

// UpdateLocation
// This method is used to update the last known location and the location history of a particular device.
exports.update = function(req, res){

  if (req.body['MiataruConfig'].EnableLocationHistory === "True")
  {
	  // with Location History
	  console.log('UpdateLocationHistory:',req.body['MiataruLocation'][0].Device);
	  var timeToKeep = req.body['MiataruConfig'].LocationDataRetentionTime*60;
	  var device_key = redis_miataru_namespace+":"+req.body['MiataruLocation'][0].Device;
	  var value = JSON.stringify(req.body['MiataruLocation'][0]);
	  	  
	  // we do want to store location history, so check if we got, so lpush and trim
	  db.lpush(device_key+":hist",value, function(err, reply) {
		 // handle returns... 
	  });

	  // take care that the location history does not grow beyond the set range of maximum_number_of_history_items
	  db.ltrim(device_key+":hist",0,maximum_number_of_history_items, function (err, reply) {
		  // handle returns...
	  });
	  
	  // finally also update the last known location...	  
	  db.set(device_key+":last",value, function (err, reply) {
      	res.send(JSON.stringify({ result: reply }));
	  });
  }
  else
  {
	  // without Location History 
	  console.log('UpdateLocation:',req.body['MiataruLocation'][0].Device);
	  var timeToKeep = req.body['MiataruConfig'].LocationDataRetentionTime*60;
	  var device_key = redis_miataru_namespace+":"+req.body['MiataruLocation'][0].Device;
	  var value = JSON.stringify(req.body['MiataruLocation'][0]);
	  
	  // we do not want to save a location history, this means if there's one we delete it...
	  db.del(device_key+":hist", function(err, reply) {
		 // eventually handle that 
	  });
	  
	  // update the last known location
	  db.setex(device_key+":last",timeToKeep,value, function (err, reply) {
      	res.send(JSON.stringify({ result: reply }));
	  });
  }
};

// GetLocation
// This is used to get the current location of a device. 
// This does not work yet:
// 		- no multiple device requests yet
exports.get = function(req, res){

	var device_key = redis_miataru_namespace+":"+req.body['MiataruGetLocation'][0].Device+":last";

	db.get(device_key, function (err, reply) 
	{
		// construct return structure
		var MiataruLocation = [JSON.parse(reply)];
	
        res.send({ "MiataruLocation": MiataruLocation});
    });
};

