module.exports = {
    port: 8888,

    database: {
        type: 'mock'
    },

    logging: {
       logLevel: 999 //logger accepts strings and numbers, in tests we dont want any logs, thus the 999
    },

    maximumNumberOfHistoryItems: 3,

    //namespacing for redis keys
    redisMiataruNamespace: 'miadTest'
};