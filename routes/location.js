
/*
 * UpdateLocation POST
 *
 * By doing a HTTP Post on the /UpdateLocation method of this server you should 
 * be able to trigger this method here.
 *
 * curl -H "Content-Type: application/json" -X POST http://localhost:3000/UpdateLocation -d '{"JSON": "HERE"}'
 *
 * curl -H "Content-Type: application/json" -X POST http://localhost:3000/UpdateLocation -d '{"MiataruConfig":{"EnableLocationHistory":"Fa":"15"},"MiataruLocation":[{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823","Timestamp":"1376735651302","Longitude":"10.837502","Latitude":"49.828925","HorizontalAccuracy":"50.00"}]}'
 *
 */

exports.update = function(req, res){

  //res.send("here be UpdateLocation Handling");

  //console.log(JSON.stringify(req.body));

  console.log('MiataruConfig', req.body['MiataruConfig']);
  console.log('MiataruLocation', req.body['MiataruLocation']);

};
