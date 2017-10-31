const routes = require('express').Router();
const os = require('os');
const ip = require('ip');

routes.use(function timeLog (req, res, next) {
  console.log(`${req.ip} @ ${new Date()} - ${req.originalUrl}`);
  next();
})

// Default route - provide basic information about the API
routes.get('/', (req, res) => {
  let responseMessage = {};
  responseMessage.boot_status = req.app.locals.bootData;
  responseMessage.current_status = {
    date:   new Date(),
    ip:     ip.address(),
    load:   os.loadavg(),
    uptime: os.uptime()
  }
  responseMessage.api = [
    {
      name:         'air',
      path:         `http://${ip.address()}:3009/air`,
      description:  'Garage air temperature and humidity.'
    },
    {
      name:         'door',
      path:         `http://${ip.address()}:3009/door`,
      description:  'Garage door status.'
    },
    {
      name:         'trigger',
      path:         `http://${ip.address()}:3009/trigger`,
      description:  'Trigger the garage door button.'
    }
  ]
  res.status(200).json(responseMessage);
});



// Return the air temperature details (these are refreshed in the background every minute)
routes.get('/air', (req, res) => {
  res.status(200).json({ response: { recent: req.app.locals.temperatureData, historic: req.app.locals.temperatureHistory } });
});


// Return the door status (this is updated in realtime)
routes.get('/door', (req, res) => {
  res.status(200).json({ response: req.app.locals.doorStatus });
});


// Trigger the door button
routes.get('/trigger', (req, res) => {

  req._gpio.write(req._PINS.RELAY, true, function(err, value) {
    setTimeout(function() {
      req._gpio.write(req._PINS.RELAY, false);
    }, 500);
  });

  res.status(200).json({ response: 'door triggered' });
});


// 404 because very last route hit
routes.use(function(req, res, next){
  res.status(404).json({ error: 'not found' });
});

module.exports = routes;
