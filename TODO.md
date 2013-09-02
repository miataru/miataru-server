# TODO

## features

### logging

* loglevels

## tests

### unit

* Config
* Location

### integration

* __UpdateLocation__    
  Expected Redis Keys are created (with and without History)    
  Error handling for wrong formatted inputs    
* __GetLocation__    
  Correct answer when no data is available / nolocation    
  correct formatted output when data is available    
* __GetLocationHistory__    
  Correct number of overall locations    
  Correct number of requested locations    
  correct formated output when data is available    

### Specification
* Security and Authentification for methods
* versioning for URL scheme
* Location Sharing Security and Rights Management?

### Client
* Adding Devices from other servers?
* How to easily add Devices? QR Codes?
