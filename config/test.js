module.exports = {
    port: 8888,
    listenip: "0.0.0.0",

    database: {
        type: 'mock'
    },

    logging: {
       logLevel: 999 //logger accepts strings and numbers, in tests we dont want any logs, thus the 999
    },

    maximumNumberOfHistoryItems: 5,

    // how many visitors to a device last and history call do we store this is +1 (starts with 0)
    maximumNumberOfLocationVistors: 10,

    // if there's an unknown visitor (no deviceID given) do you want it still to be added to the visitor history?
    addEmptyVisitorDeviceIDtoVisitorHistory: true,

    // controls how visitor history entries are recorded: false = each device recorded once and updated on subsequent accesses, true = every access recorded as separate entry
    recordDetailedVisitorHistory: false,

    // enforce RequestMiataruDeviceKey validation for GetLocation read requests when the requesting device has a DeviceKey configured
    strictDeviceKeyCheck: true,

    //namespacing for redis keys
    redisMiataruNamespace: 'miadTest',

    //CORS configuration for testing
    cors: {
        allowedOrigins: ["http://localhost:3000", "http://test.example.com"]
    }
};
