/*
  Simple IP filter for the API.
*/

const ipFilter = function(req, res, next) {
  if (['::1', '::ffff:10.0.0.22', '10.0.0.22'].indexOf(req.ip) > -1) {
    next();
  }else{
    res.status(403).json({ error: 'forbidden'}).end();
  }
}

module.exports = ipFilter;
