/*
  Remote PI API
*/

const express = require('express'),
      async = require('async'),
      moment = require('moment'),
      os = require('os'),
      ip = require('ip');

const routes = require('./routes'),
      ipFilter = require('./ipfilter');

// Express App
const app = express();

// Volatile Data
const bootData = app.locals.bootData = {
  date:   new Date(),
  ip:     ip.address(),
  load:   os.loadavg(),
  uptime: os.uptime()
}

// GPIO Pins
const PINS = {
  RELAY:    0,
  DOOR_TOP: 0,
  DOOR_MID: 0,
  DOOR_BOT: 0,
  TEMP:     0
}

// Attach Sensor & GPIOs to Req
app.use(function(req,res,next) {
  req._gpio = 'gpio';
  req._PINS = PINS;
  next();
});

// Load API Routes
app.use(ipFilter);
app.use(routes);

// Print Log
console.log(`
###################################
#    Remote Raspberry Pi Server   #
###################################

+    Date: ${moment(bootData.date).format('lll')}
+      IP: ${ip.address()}
+    Load: ${Math.round(bootData.load[0]*100/os.cpus().length)}% / ${Math.round(bootData.load[1]*100/os.cpus().length)}% / ${Math.round(bootData.load[2]*100/os.cpus().length)}%
+  Uptime: ${moment.duration(bootData.uptime, "seconds").humanize()}
-`);

// Boot the API Server!
async.parallel([
    function(callback) {
        console.log(`+  GPIO Setup: Door Top [#${PINS.DOOR_TOP}]`);
        //gpio.setup(PINS.DOOR_TOP, gpio.DIR_IN, gpio.EDGE_BOTH, callback);
        callback();
    },
    function(callback) {
        console.log(`+  GPIO Setup: Door Middle [#${PINS.DOOR_MID}]`);
        //gpio.setup(PINS.DOOR_MID, gpio.DIR_IN, gpio.EDGE_BOTH, callback);
        callback();
    },
    function(callback) {
        console.log(`+  GPIO Setup: Door Bottom [#${PINS.DOOR_BOT}]`);
        //gpio.setup(PINS.DOOR_BOT, gpio.DIR_IN, gpio.EDGE_BOTH, callback);
        callback();
    },
    function(callback) {
        console.log(`+  GPIO Setup: Relay [#${PINS.RELAY}]`);
        //gpio.setup(PINS.RELAY, gpio.DIR_LOW, callback);
        callback();
    },
    function(callback) {
        console.log(`+  Setup Temperature Data`);
        app.locals.temperatureData = [];

        console.log(`+  Setup Door Status`);
        app.locals.doorStatus = {
          updated:    new Date(),
          position:   'unknown',
          direction:  'unknown'
        };
        callback();
    }
],
// optional callback
function(err, results) {
    if (err) {
      console.log('# API Server Failed');
    } else {
      app.listen(3001, function () {
        console.log(`+  API Ready @ ${ip.address()}:3001`);
      });
    }
});


// Timed Service
setInterval(function() {
  // Temperature Data
  if (app.locals.temperatureData.length >= 10) {
    app.locals.temperatureData.pop();
  }

  sensor.read(22, PINS.TEMP, function(err, temperature, humidity) {
    if (!err) {
      app.locals.temperatureData.unshift({
        time:     new Date(),
        temp:     temperature.toFixed(1),
        humidity: humidity.toFixed(1)
      });
    }
  });

}, 60 * 1000);


// Event Driven Service
gpio.on('change', function(channel, value) {
  // Detect which channel has changed.
  // Moving from true to false means it's moving away.
  // Moving from false to true means it has moved there.
  // Ascertain direction:
  //    Bottom trigger turned false means moving up,
  //    Middle trigger turning false means moving past half way.
  //    Top trigger turning false means moving down.

  app.locals.doorStatus = {
    position:   '',
    direction:  ''
  }

});
