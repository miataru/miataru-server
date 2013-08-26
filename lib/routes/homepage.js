/*
 * GET home page.
 */

function index(req, res){
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('this is miataru, welcome!');
}

module.exports.install = function(app) {
    app.get('/', index);
};