/**
 * Miataru Server
 * 
 * 
 */
var http = require('http');
var path = require('path');

var express = require('express');

var routes = require('./routes');
var location = require('./routes/location');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

// where POSTs go
app.post('/UpdateLocation', location.update);
app.post('/GetLocation', location.get);

http.createServer(app).listen(app.get('port'), function(){
  console.log('miataru server listening on port ' + app.get('port'));
});
