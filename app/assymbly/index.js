const Prometheus = require('prom-client')
var CronJob = require('cron').CronJob;
var config = require('../config');
var metricConfig = config.getMetricConfig();
var cached = require('../cache')
var costExp = require('../aws')
var logger = require('../logger');

//exmp: cost_all{type='all'} 1888.005202332
const costAllUSD = new Prometheus.Gauge({
    name: 'cost_all',
    help: 'AWS Ressources cost all Regions and all Services',
    labelNames: ['type', 'unit']
})

//exmp: cost_region{type='region', service='all', region='eu-north-1', unit='usd'} 296.7056863111
//exmp: cost_region{type='region', service='AWS Key Management Service', region='eu-north-1', unit='usd'} 0.000111
const costByRegion = new Prometheus.Gauge({
    name: 'cost_region',
    help: 'Cost sorted by region',
    labelNames: ['type', 'service', 'region', 'unit']
})

//exmp: cost_service{type='service', service='AWS Secrets Manager', region='all', unit='usd'} 2.1215026336
//exmp: cost_service{type='service', service='AWS Secrets Manager', region='eu-north-1', unit='usd'} 0.466095752
const costByService = new Prometheus.Gauge({
    name: 'cost_service',
    help: 'Cost sorted by service',
    labelNames: ['type', 'service', 'region', 'unit']
})

function metricCollector() { }

//first run and start of cronjob
metricCollector.prototype.collectMetrics = async function () {

    var jobRun = function () {
        new CronJob(metricConfig.cronJob, async function () {
            try {
                var metricsCollted = await getMetrics();
                if (metricsCollted) {
                    
                } else {
                    return err;
                }
            }
            catch (err) {
                return err
            }
        }, null, true, metricConfig.timeZone);
    }

    if (cached.get('initRun') == undefined) {
        var metricsAll = await getMetrics();
        if(metricsAll){
            logger.info('Metrics was collected');
            jobRun();
        } else {
            logger.error(metricsAll);
            process.exit(1);
        }
    } else {
        jobRun();
    }
}

//collect metrics and write they to cache as a prometheus metric
var getMetrics = async function () {

    var regionsAllAct = await costExp.getActiveRegions(); //get monthly cost, check active regions
    var serviceAllAct = await costExp.getActiveServices(); //Get monthly cost, check active services
    var allCostDaily = await costExp.getAllCostDaily();
    
    //cost_all{type="all"} 1655.8311381101
    costAllUSD.labels('all', allCostDaily.ResultsByTime[0].Total.UnblendedCost.Unit).set(parseFloat(allCostDaily.ResultsByTime[0].Total.UnblendedCost.Amount,10));

    //check if env var AWS_SERVICES was set, if yes spit the input in an array
    if(metricConfig.services == 'all'){
        var servicesToRead = serviceAllAct.DimensionValues
    } else {
        var servicesToReadArr = metricConfig.services.split(',');
        var servicesToRead = [];
        for(var i = 0; i < servicesToReadArr.length; i++){
            servicesToRead.push({
                Value: servicesToReadArr[i]
            })
        }
    }

    //check if env var AWS_REGIONS was set, if yes spit the input in an array
    if(metricConfig.regions == 'all'){
        var regionsToRead = regionsAllAct
    } else {
        var regionsToReadArr = metricConfig.regions.split(',');
        var regionsToRead = [];
        for(var i = 0; i < regionsToReadArr.length; i++){
            regionsToRead.push({
                region: regionsToReadArr[i]
            })
        }
    }

    //get cost by region
    for (var i = 0; i < regionsToRead.length; i++) {
        var region = regionsToRead[i];
        var regiondailyCost = await costExp.getCostPerRegionDaily(region.region)

        //get all regions, where cost was bigger then $0.0001
        if (Number(regiondailyCost.ResultsByTime[0].Total.UnblendedCost.Amount) > 0.0001) {
            var currencyUnit = regiondailyCost.ResultsByTime[0].Total.UnblendedCost.Unit;
            var total = regiondailyCost.ResultsByTime[0].Total.UnblendedCost.Amount; 
            
            //exmp: cost_region{type='region', service='all', region='eu-north-1', unit='usd'} 296.7056863111
            costByRegion.labels('region', 'all', region.region, currencyUnit).set(parseFloat(total, 10));

            for (var y = 0; y < servicesToRead.length; y++) {
                var service = servicesToRead[y]

                var serviceCostDaily = await costExp.getCostRegionServiceDaily(region.region, service.Value);

                //get all services, where cost was bigger then $0.0001
                if (Number(serviceCostDaily.ResultsByTime[0].Total.UnblendedCost.Amount) > 0.0001) {
                    var serviceTotal = serviceCostDaily.ResultsByTime[0].Total.UnblendedCost.Amount;

                    costByRegion.labels('region', service.Value, region.region, currencyUnit).set(parseFloat(serviceTotal, 10));
                }
            }
        }
    }

    //get cost by service
    for (var i = 0; i < servicesToRead.length; i++) {
        var service = servicesToRead[i]
        var serviceCostDaily = await costExp.getCostPerServiceDaily(service.Value);

        //get all services, where cost was bigger then $0.0001
        if (Number(serviceCostDaily.ResultsByTime[0].Total.UnblendedCost.Amount) > 0.0001) {
            var currencyUnit = serviceCostDaily.ResultsByTime[0].Total.UnblendedCost.Unit
            var total = serviceCostDaily.ResultsByTime[0].Total.UnblendedCost.Amount //daily cost of service

            //exmp: cost_service{type='service', service='AWS Secrets Manager', region='all', unit='usd'} 2.1215026336
            costByService.labels('service', service.Value, 'all', currencyUnit).set(parseFloat(total, 10));

            for (var y = 0; y < regionsToRead.length; y++) {
                var region = regionsToRead[y]

                var regionCostDaily = await costExp.getCostRegionServiceDaily(region.region, service.Value)
                
                //get all regions, where cost was bigger then $0.0001
                if (Number(regionCostDaily.ResultsByTime[0].Total.UnblendedCost.Amount) > 0.0001) {
                    var regionTotal = regionCostDaily.ResultsByTime[0].Total.UnblendedCost.Amount;

                    //exmp: cost_service{type='service', service='AWS Secrets Manager', region='eu-north-1', unit='usd'} 0.466095752
                    costByService.labels('service', service.Value, region.region, currencyUnit).set(parseFloat(regionTotal, 10));
                }
            }
        }
    }

    // //set true, if first running was okay
    cached.set('initRun', true);
    
    //save metric strings into cached
    cached.set('metrics', Prometheus.register.metrics())

    return true
}

module.exports = metricCollector
