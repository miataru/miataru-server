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
var redis = require('redis');
var db = redis.createClient(null, null, {detect_buffers: true});

var maximum_number_of_history_items = 1024;
var redis_miataru_namespace= "miad";

// UpdateLocation
exports.update = function(req, res){

  if (req.body['MiataruConfig'].EnableLocationHistory === "True")
  {
	  // with Location History
	  console.log('UpdateLocation:',req.body['MiataruLocation'][0].Device);
	  var timeToKeep = req.body['MiataruConfig'].LocationDataRetentionTime*60;
	  var device_key = redis_miataru_namespace+":"+req.body['MiataruLocation'][0].Device;
	  var value = req.body['MiataruLocation'][0];
	  
	  // we do want to store location history, so check if we got, so lpush and trim
	  db.lpush(device_key+":hist",value, function(err, reply) {
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
	  var value = req.body['MiataruLocation'][0];
	  
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
exports.get = function(req, res){

	console.log(req);
	
	res.send(JSON.stringify(req.body));

};

