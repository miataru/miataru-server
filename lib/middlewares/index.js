var cors = require('./cors');

function install(app) {
    app.use(cors);

    //we surely will add some middlewares sometimes...

//    app.use(function(req, res, next) {
//        console.log( 'yay, Im a middleware!' );
//        next();
//    });
}

module.exports.install = install;
