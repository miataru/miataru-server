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

    //namespacing for redis keys
    redisMiataruNamespace: 'miadTest'
};
