/*
  Simple IP filter for the API.
*/

const ipFilter = function(req, res, next) {
  if ([ '::1',
        '::ffff:10.0.0.20', '10.0.0.20',    // Macbook
        '::ffff:10.0.0.22', '10.0.0.22',    // iPhone
        '::ffff:10.0.0.23', '10.0.0.23',    // iPhone
        '::ffff:10.10.10.10', '10.10.10.10' // rPi Server
      ].indexOf(req.ip) > -1) {
    next();
  }else{
    res.status(403).json({ error: 'forbidden'}).end();
  }
}

module.exports = ipFilter;
