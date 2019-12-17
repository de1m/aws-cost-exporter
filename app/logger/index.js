
var log4js = require('log4js');
var logger = log4js.getLogger('aws-cost-exporter');

if(process.env.DEBUG == "true" || process.env.DEBUG == "yes"){
  logger.level = "debug"
} else {
  logger.level = "info"
}
logger.info("Logger started. Mode: " + logger.level)

module.exports = logger;
