const express = require('express')
var logger = require('../logger')
var cached = require('../cache')

var config = require('../config');
var metrSrv = config.getMetricConfig();

//http server to show the metrics from aws cost
function metricServer() {

}
//start the http server
metricServer.prototype.startServer = function () {
    const app = express()
    const port = metrSrv.mport
  
    app.get('/', (req, res, next) => {
      res.json({ message: '/metrics' })
    })
  
    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      res.end(cached.get('metrics'));
    })
  
    // Error handler
    app.use((err, req, res, next) => {
      res.statusCode = 500
      res.json({ error: err.message })
      next()
    })
  
    app.listen(port, () => {
      logger.info('Metric server was startet on port ' + port);
    })
  }

module.exports = metricServer;
