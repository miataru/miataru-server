module.exports = {

    //which port should the server bind to
    port: 8080,

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
    }

};