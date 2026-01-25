# miataru-webclient

This is the HTML5 Implementation of a Miataru Client Application. You can get more information [here](http://miataru.com/client/#BF0160F5-4138-402C-A5F0-DEB1AA1F4216).

## What is Miataru?

If you want to track where you have been and allow your own services and toolchain to access your location data you have a lot of options.

With most of the services that allow you to track your location over time you give away control over that very important piece of information. You simply don't know what all those service providers do with your data.

That's why Miataru was created. Miataru or 見当たる is Japanese and means "be found" or "to come across" and it's a set of client and server application that allow you to track your location and retain full control over your location data.

Since the server application and protocol will be fully opened and can be downloaded and hosted on your own servers this means you can be in full control every second of using Miataru.

If you do not have the option of hosting the Miataru server yourself we're offering a free service that allows you to connect the Miataru client applications with your own services.

By default Miataru does only store the last known location. And it only does that for a pre-defined amount of time. Nothing is written to any disk, everything is in-memory only and only available for a pre-defined time-window.

With it's simple API it allows you to use Miataru to your own needs and practices.

## Run the Webclient

Just copy the webclient to any HTTP server that you like and edit the Miataru Service URL in the index.js file (search for service.miataru.com). 

Please be aware that depending on the URL scheme you're using for your own service you might need to add Custom Headers (e.g. Access-Control-Allow-Origin "*", Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept").
