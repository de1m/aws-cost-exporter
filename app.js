var logger = require('./app/logger')
var config = require('./app/config')
var awsConfig = config.getAWSConfig();
var metricCollector = require('./app/assymbly')
var metricServ = require('./app/metricSrv');

//check the environments variables
config.checkAllConfig(function(err){
    if(err){
        if(awsConfig.provider != 'AWS'){
            logger.error(err)
            process.exit(1);
        }
    } else {
        logger.debug('configuration keys was found');
    }
});

logger.debug("Exporter was startet...");

//start metric job
var metricCol = new metricCollector();
metricCol.collectMetrics();

// start http server for metrics
var msrv = new metricServ();
msrv.startServer();
