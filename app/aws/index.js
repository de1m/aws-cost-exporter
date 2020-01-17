var AWS = require('aws-sdk');
var logger = require('../logger');
var config = require('../config');
var awsConfig = config.getAWSConfig();
var metricConfig = config.getMetricConfig();

//check the aws credentions - webtoken or simply aws key and secret key
if (awsConfig.provider != 'unset') {
    if (awsConfig.provider == 'AWS') {
        logger.debug("AWS native auth");
        AWS.config = new AWS.Config();
        AWS.config.region = awsConfig.region;
        
        AWS.config.credentials = new AWS.TokenFileWebIdentityCredentials();

        AWS.config.getCredentials(function(err, result){
            if(err){
                logger.error(err);
                process.exit(1);
            }
        })

    } else {
        logger.error("Env variable is set, but it's not AWS. Exit");
        process.exit(1);
    }

} else {

    logger.debug("AWS key auth");

    AWS.config = new AWS.Config();
    AWS.config.region = awsConfig.region;

    if (process.env.AWS_ACCESSKEYID) {
        AWS.config.accessKeyId = awsConfig.accessKeyId;
    } else {
        logger.error("ENV var AWS_ACCESSKEYID not found");
        process.exit(1);
    }
    if (process.env.AWS_SECRETACCESSKEY) {
        AWS.config.secretAccessKey = awsConfig.secretAccessKey;
    } else {
        logger.error("ENV var AWS_SECRETACCESSKEY not found");
        process.exit(1);
    }

}


//get all cost of a day
var getAllCostDaily = async function () {

    //get timerage between today and last day
    var days = 1;
    var date = new Date();
    var todayDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate())
    var startDay = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate() - days < 10 ? '0' + (date.getUTCDate() - days) : date.getUTCDate() - days)
    logger.debug('Time Period: ' + startDay + ' - ' + todayDate);
    var params = {
        TimePeriod: { /* required */
            "Start": startDay,
            "End": todayDate
        },
        Granularity: 'DAILY',
        Metrics: [metricConfig.metrictype]
    };

    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output)
        }
        catch (err) {
            reject(err);
        }
    })

}

//get all regions
var getRegions = async function () {

    return new Promise(async (resolve, reject) => {

        var regions = new AWS.EC2
        regions.describeRegions('', function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    })
}

//get regions, where cost for last month was not null
var getActiveRegions = async function () {
    var activeRegions = []
    return new Promise(async (resolve, reject) => {
        try {
            var allRegionsArr = await getRegions();
            for (var i = 0; i < allRegionsArr.Regions.length; i++) {
                var region = allRegionsArr.Regions[i]
                var actRegion = await checkRegionCost(region.RegionName);
                if (actRegion.amount > 0) {
                    activeRegions.push(actRegion);
                }
            }
            resolve(activeRegions);
        }
        catch (err) {
            return reject(err)
        }

    })
}

//get all services, where monthly cost was not null
var getActiveServices = async function () {

    return new Promise(async (resolve, reject) => {
        try {
            var allServices = await getServices();
            resolve(allServices);
        }
        catch (err) {
            reject(err)
        }
    })
}

// //get cost in region last month
var checkRegionCost = async function (regionName) {
    var date = new Date();
    var todayDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate()))
    var firstDayMonthDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-01')

    var params = {
        TimePeriod: { /* required */
            "Start": firstDayMonthDate,
            "End": todayDate
        },
        Granularity: 'MONTHLY',
        Metrics: [metricConfig.metrictype],
        Filter: {
            "Dimensions": {
                "Key": "REGION",
                "Values": [regionName]
            }
        }
    };
    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve({
                'region': regionName,
                'amount': output.ResultsByTime[0].Total[metricConfig.metrictype].Amount,
                'unit': output.ResultsByTime[0].Total[metricConfig.metrictype].Unit
            });
        }
        catch (err) {
            reject(err);
        }
    })
}

//get services, where cost in last month was not null
var getAccounts = function () {
    var date = new Date();
    var todayDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate()))
    var firstDayMonthDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-01'

    var params = {
        TimePeriod: { /* required */
            "Start": firstDayMonthDate,
            "End": todayDate
        },
        "Dimension": "LINKED_ACCOUNT"
    };

    var costexplorer = new AWS.CostExplorer();
    return new Promise((resolve, reject) => {
        costexplorer.getDimensionValues(params, function (err, result) {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })

}

// //get cost in region last month
var getAccountCostMonthly = async function (accId) {
    var date = new Date();
    var todayDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate()))
    var firstDayMonthDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-01')

    var params = {
        TimePeriod: { /* required */
            "Start": firstDayMonthDate,
            "End": todayDate
        },
        Granularity: 'MONTHLY',
        Metrics: [metricConfig.metrictype],
        Filter: {
            "Dimensions": {
                "Key": "LINKED_ACCOUNT",
                "Values": [accId]
            }
        }
    };
    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output);
        }
        catch (err) {
            reject(err);
        }
    })
}

//get services, where cost in last month was not null
var getServices = function () {
    var date = new Date();
    var todayDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate()))
    var firstDayMonthDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-01'

    var params = {
        TimePeriod: { /* required */
            "Start": firstDayMonthDate,
            "End": todayDate
        },
        "Dimension": "Service"
    };

    var costexplorer = new AWS.CostExplorer();
    return new Promise((resolve, reject) => {
        costexplorer.getDimensionValues(params, function (err, result) {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })

}

//get cost of last day of certain region
var getCostPerRegionDaily = function (regionName) {
    var days = 1;
    var date = new Date();
    var todayDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate())
    var startDay = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate() - days < 10 ? '0' + date.getUTCDate() - days : date.getUTCDate() - days)

    var params = {
        TimePeriod: { /* required */
            "Start": startDay,
            "End": todayDate
        },
        Granularity: 'DAILY',
        Metrics: [metricConfig.metrictype],
        Filter: {
            "Dimensions": {
                "Key": "REGION",
                "Values": [regionName]
            }
        }
    };

    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output)
        }
        catch (err) {
            reject(err);
        }
    })
}

//get cost of last day for certain service
var getCostPerServiceDaily = function (service) {

    var days = 1;

    var date = new Date();
    var todayDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate())
    var startDay = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate() - days < 10 ? '0' + date.getUTCDate() - days : date.getUTCDate() - days)

    var params = {
        TimePeriod: { /* required */
            "Start": startDay,
            "End": todayDate
        },
        Granularity: 'DAILY',
        Metrics: [metricConfig.metrictype],
        Filter: {
            "Dimensions": {
                "Key": "SERVICE",
                "Values": [service]
            }
        }
    };

    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output)
        }
        catch (err) {
            reject(err);
        }
    })
}

//get cost of region and service of one day
var getCostRegionServiceDaily = function (region, service) {
    var days = 1;
    var date = new Date();
    var todayDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate())
    var startDay = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
        '-' + (date.getUTCDate() - days < 10 ? '0' + date.getUTCDate() - days : date.getUTCDate() - days)

    var params = {
        TimePeriod: { /* required */
            "Start": startDay,
            "End": todayDate
        },
        Granularity: 'DAILY',
        Metrics: [metricConfig.metrictype],
        Filter: {
            //get cost from ec2 in integration
            And: [
                {
                    "Dimensions": {
                        "Key": "SERVICE",
                        "Values": [service]
                    }
                },
                {
                    "Dimensions": {
                        "Key": "REGION",
                        "Values": [region]
                    }
                }
            ]
        }
    };

    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output)
        }
        catch (err) {
            reject(err);
        }
    })
}

//aws api call
var getAWSCostApi = function (params) {

    var costexplorer = new AWS.CostExplorer();

    return new Promise((resolve, reject) => {
        costexplorer.getCostAndUsage(params, function (err, result) {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

module.exports = {
    getRegions, checkRegionCost, getCostPerRegionDaily, getActiveRegions, getActiveServices, getCostRegionServiceDaily, getCostPerServiceDaily, getAllCostDaily,getAccountCostMonthly,getAccounts
}
