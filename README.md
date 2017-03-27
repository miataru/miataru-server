[![Build Status](https://travis-ci.org/miataru/miataru-server.png)](https://travis-ci.org/miataru/miataru-server)
[![Code Climate](https://codeclimate.com/github/miataru/miataru-server/badges/gpa.svg)](https://codeclimate.com/github/miataru/miataru-server)

# miataru-server

This is the source code of a Miataru server side implementation. You can get more information [here](http://www.miataru.com).

## What is Miataru?

If you want to track where you have been and allow your own services and toolchain to access your location data you have a lot of options.

With most of the services that allow you to track your location over time you give away control over that very important piece of information. You simply don't know what all those service providers do with your data.

That's why Miataru was created. Miataru or 見当たる is Japanese and means "be found" or "to come across" and it's a set of client and server application that allow you to track your location and retain full control over your location data.

Since the server application and protocol will be fully opened and can be downloaded and hosted on your own servers this means you can be in full control every second of using Miataru.

If you do not have the option of hosting the Miataru server yourself we're offering a free service that allows you to connect the Miataru client applications with your own services.

By default Miataru does only store the last known location. And it only does that for a pre-defined amount of time. Nothing is written to any disk, everything is in-memory only and only available for a pre-defined time-window.

With it's simple API it allows you to use Miataru to your own needs and practices.

## Run the Server

Check out the repo:  
`git clone git@github.com:miataru/miataru-server.git`

Install dependencies:  
`npm install`

Run the tests:  
`make run-all-tests`

Configuration:
Adjust the configuration in `./lib/config` or add your own

Start Server:
`node server.js`

The server will, in the default configuration, listen on localhost port 8080. To do some test requests on the commandline, do this:

to set a location:

curl -H 'Content-Type: application/json' -X POST 'http://localhost:8080/UpdateLocation' -d '{"MiataruConfig":{"EnableLocationHistory":"True","LocationDataRetentionTime":"15"},"MiataruLocation":[{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823","Timestamp":"1376735651302","Longitude":"10.837502","Latitude":"49.828925","HorizontalAccuracy":"50.00"}]}'

to retrieve a location:

curl -H 'Content-Type: application/json' -X POST 'http://localhost:8080/GetLocation' -d '{"MiataruGetLocation":[{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823"}]}'

## Docker

You can use the included Dockerfile to build your own docker image for running a miataru server. 

It is based upon the current alpine version of the official nodejs image and will build itself to approx. 80mbyte of size.

To use run the docker build:
```
docker build -t miataru .
```

And run the image:

```
docker run -it -d --name miataru -p 3101:8090 miataru
```

It is going to use the default config, which is fakeredis right now. To use proper Redis and more complex
configurations please change the configuration and in such a case link the miataru container to a redis container.


### Configuration

Configurations are stored in `./config/`. 

A configuration file has to be a javascript file that exports a object (following the commonJS directive):
```
module.exports = {
  myFooKey: 'foo',
  myBarKey: {
    spam: 'eggs'
  }
}
```

The standard configuration `default.js` will always be loaded. 
In addition environment specific configs can be specified denoted by `{envName}.js`.
For development you can specify a user specific configuration in the form of `user.{userName}.js`.
This only works when the environment variable `NODE_ENV` is set to `development`.

In addition a external configuration can be speciefied via a command line parameter that comes in handy for production when you don't want to checkin sensibel access credentials into source control. The specified path has to be absolute.  
`node server.js --externalconfig=/etc/miataru/config.js`

All other command line parameters get merged into the configuration.

## Dependencies

Miataru server uses NodeJS, Redis and ExpressJS
