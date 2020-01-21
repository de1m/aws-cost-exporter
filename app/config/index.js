var AWSConfig = {
    name: 'aws-config',
    accessKeyId: process.env.AWS_ACCESSKEYID || false,
    secretAccessKey: process.env.AWS_SECRETACCESSKEY || false,
    region: process.env.AWS_COSTREGION || "us-east-1",
    provider: process.env.PROVIDER || 'unset'
}

var metricInfo = {
    name: 'metric-info',
    mport: process.env.MPORT || 9232,
    timewait: process.env.TIMEWAIT || 600,
    cronJob: process.env.CRON || '* 5 * * *',
    services: process.env.AWS_SERVICES || 'all',
    regions: process.env.AWS_REGIONS || 'all',
    metrictype: process.env.AWS_METRICTYPE || 'UnblendedCost'
}

function checkConfiguration(chkObj) {
    var returnArr = [];
    Object.keys(chkObj).forEach(function (key) {
        var val = chkObj[key];
        if (val == undefined || val == null || val == '') {
            returnArr.push({ "name": chkObj.name, "key": key, "value": val });
        }
    });
    return returnArr;
}

var checkAllConfig = function (callback) {
    var returnArr = [];
    [AWSConfig, metricInfo].forEach((chkObj) => {
        var retUndefined = checkConfiguration(chkObj);
        if (retUndefined.length > 0) {
            retUndefined.forEach((obj) => {
                returnArr.push(obj);
            })
        }
    })

    if (returnArr.length > 0) {
        return callback(returnArr, null);
    } else {
        return callback(null, returnArr);
    }
}

var getAWSConfig = function () {
    return AWSConfig;
}

var getMetricConfig = function () {
    return metricInfo;
}

module.exports = { getAWSConfig, checkAllConfig, getMetricConfig}
