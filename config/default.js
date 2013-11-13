//the default configuration is a configuration that will *not* be used in production
//the sole purpose is to feature each and every relevant key and to provide a "ready-to-go" configuration
//so that a developer can run the application locally

module.exports = {

    //which port should the server bind to
    port: 8080,

    //the ip that should be used
    listenip: "0.0.0.0",
    
    //configuration for the redis database
    //type indicates if fakeredis should be used (testing and devlopment)
    // or if a real redis db should be queried (production)
    database: {
        type: 'mock' //mock|real
        //for the mock type we're done configuring, however a real server needs some more love.
        //use this parameters, e.g. in your local setup or for production
        /*
        host: 'localhost',
        port: 6379,
        userName: 'root',
        password: ''
        */
    },

    logging: {
        logLevel: 'info'
    },

    //how many items should be saved at max, keep in mind that this is +1 (starts with 0)
    maximumNumberOfHistoryItems: 1023,

    //namespacing for redis keys
    redisMiataruNamespace: "miad"

};
