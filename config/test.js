module.exports = {
    port: 8888,
    listenip: "0.0.0.0",

    database: {
        type: 'mock'
    },

    maximumNumberOfHistoryItems: 3,

    //namespacing for redis keys
    redisMiataruNamespace: 'miadTest'
};
