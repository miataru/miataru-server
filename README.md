[![Build Status](https://travis-ci.org/miataru/miataru-server.png)](https://travis-ci.org/miataru/miataru-server)

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

In addition a external configuration can be speciefied via a command line parameter that comes in handy for production when you don't want to checkin sensibel access credentials into source control. The specified path has to be absolute.  
`node server.js --externalconfig=/etc/miataru/config.js`

All other command line parameters get merged into the configuration.

## Dependencies

Miataru server uses NodeJS, Redis and ExpressJS
