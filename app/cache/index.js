const NodeCache = require( "node-cache" );
const logger = ('../logger');
const myCache = new NodeCache();

myCache.on( "expired", function( key, value ){
    logger.DEBUG('Key "' + key + '" expired');
});

module.exports = myCache;
