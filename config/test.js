module.exports = {
    port: 8888,

    database: {
        type: 'mock'
    },

    maximumNumberOfHistoryItems: 3,

    //namespacing for redis keys
    redisMiataruNamespace: 'miadTest'
};