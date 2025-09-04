/*
 * GET home page.
 */

function index(req, res){
    res.set('Content-Type', 'text/plain');
    res.send('this is the miataru service backend, welcome!\n\n' +
        'Homepage: http://www.miataru.com/\n' +
        'API-Documentation: http://www.miataru.com/#tabr4');
}

module.exports.install = function(app) {
    app.get('/', index);
};