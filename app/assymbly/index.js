const Prometheus = require('prom-client')
var CronJob = require('cron').CronJob;
var cron = require('node-cron');
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
        cron.schedule(metricConfig.cronJob, async () => {
            try {
                var metricsCollted = await getMetrics();
                if (metricsCollted) {
                    logger.info('Metrics was collected');
                } else {
                    return err;
                }
            }
            catch (err) {
                return err
            }
        })
    }

    if (cached.get('initRun') == undefined) {
        var metricsAll = await getMetrics();
        if (metricsAll) {
            logger.info('Metrics was collected');
            jobRun();
        } else {
            logger.error(metricsAll, 'Exit(err)');
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

    // cost_all{type="all"} 1655.8311381101
    costAllUSD.labels('all', allCostDaily.ResultsByTime[0].Total[metricConfig.metrictype].Unit).set(parseFloat(allCostDaily.ResultsByTime[0].Total[metricConfig.metrictype].Amount, 10));

    //check if env var AWS_SERVICES was set, if yes spit the input in an array
    if (metricConfig.services == 'all') {
        var servicesToRead = serviceAllAct.DimensionValues
    } else {
        var servicesToReadArr = metricConfig.services.split(',');
        var servicesToRead = [];
        for (var i = 0; i < servicesToReadArr.length; i++) {
            servicesToRead.push({
                Value: servicesToReadArr[i]
            })
        }
    }

    //check if env var AWS_REGIONS was set, if yes spit the input in an array
    if (metricConfig.regions == 'all') {
        var regionsToRead = regionsAllAct
    } else {
        var regionsToReadArr = metricConfig.regions.split(',');
        var regionsToRead = [];
        for (var i = 0; i < regionsToReadArr.length; i++) {
            regionsToRead.push({
                region: regionsToReadArr[i]
            })
        }
    }

    var regionArr = [];
    var regCount = 0;

    //get cost by region
    for (var i = 0; i < regionsToRead.length; i++) {
        var serviceCount = 0;
        var region = regionsToRead[i];
        var regiondailyCost = await costExp.getCostPerRegionDaily(region.region)

        //get all regions, where cost was bigger then $0.0001
        if (Number(regiondailyCost.ResultsByTime[0].Total[metricConfig.metrictype].Amount) > 0.0001) {
            var currencyUnit = regiondailyCost.ResultsByTime[0].Total[metricConfig.metrictype].Unit;
            var total = regiondailyCost.ResultsByTime[0].Total[metricConfig.metrictype].Amount;
            regionArr.push({
                region: region.region,
                total: total,
                unit: currencyUnit,
                services: []
            })
            //exmp: cost_region{type='region', service='all', region='eu-north-1', unit='usd'} 296.7056863111
            costByRegion.labels('region', 'all', region.region, currencyUnit).set(parseFloat(total, 10));
            logger.debug("Added metric 'region all' to cache")

            for (var y = 0; y < servicesToRead.length; y++) {
                var service = servicesToRead[y]

                var serviceCostDaily = await costExp.getCostRegionServiceDaily(region.region, service.Value);

                //get all services, where cost was bigger then $0.0001
                if (Number(serviceCostDaily.ResultsByTime[0].Total[metricConfig.metrictype].Amount) > 0.0001) {
                    var serviceTotal = serviceCostDaily.ResultsByTime[0].Total[metricConfig.metrictype].Amount;
                    costByRegion.labels('region', service.Value, region.region, currencyUnit).set(parseFloat(serviceTotal, 10));
                    logger.debug("Added metric 'service " + service.Value + "' for region '" + region.region + "' to cache")
                    regionArr[regCount].services[serviceCount] = {
                        total: serviceTotal,
                        unit: currencyUnit,
                        service: service.Value
                    }
                    serviceCount++;
                }
            }

            regCount++;
        }
    }


    //get cost by service

    var servicesArr = [];
    var regionCount = 0;
    var serviceCount = 0;

    for (var i = 0; i < regionArr.length; i++) {
        var regions = regionArr[i]

        for (var y = 0; y < regions.services.length; y++) {
            var service = regions.services[y]

            var picked = servicesArr.findIndex(o => o.service === service.service);
            if (picked == -1) { // not found
                servicesArr.push({
                    total: service.total,
                    unit: service.unit,
                    service: service.service,
                    regions: []
                })

                servicesArr[serviceCount].regions[regionCount] = {
                    total: service.total,
                    unit: service.unit,
                    region: regions.region
                }
                serviceCount++;
            } else {
                var sum = parseFloat(service.total, 10) + parseFloat(servicesArr[picked].total, 10)
                servicesArr[picked].total = sum;
                servicesArr[picked].regions.push({
                    total: service.total,
                    unit: service.unit,
                    region: regions.region
                })
            }
        }
        regionCount++;
    }

    for (var i = 0; i < servicesArr.length; i++) {
        var service = servicesArr[i];
        costByService.labels('service', service.service, 'all', currencyUnit).set(parseFloat(service.total, 10));
        service.regions.forEach(region => {
            costByService.labels('service', service.service, region.region, currencyUnit).set(parseFloat(region.total, 10));
        });
    }


    // //set true, if first running was okay
    cached.set('initRun', true);

    //save metric strings into cached
    cached.set('metrics', Prometheus.register.metrics())
    logger.debug("Added metrics to prometheus cache");

    return true
}

module.exports = metricCollector
