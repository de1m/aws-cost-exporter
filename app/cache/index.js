const NodeCache = require( "node-cache" );
var logger = require('../logger');
const myCache = new NodeCache();

myCache.on( "expired", function( key, value ){
    logger.debug('Key "' + key + '" expired');
});

myCache.on('set', function(key, value){
    logger.debug('Cache key "' + key  + "' was set");
})

module.exports = myCache;
