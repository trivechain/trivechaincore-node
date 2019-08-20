'use strict';

var path = require('path');

/**
 * Will return the path and default trivechaincore-node configuration on environment variables
 * or default locations.
 * @param {Object} options
 * @param {String} options.network - "testnet" or "livenet"
 * @param {String} options.datadir - Absolute path to Trivechain database directory
 */
function getDefaultBaseConfig(options) {
  if (!options) {
    options = {};
  }

  var datadir = options.datadir || path.resolve(process.env.HOME, '.trivechain');

  return {
    path: process.cwd(),
    config: {
      network: options.network || 'livenet',
      port: 3001,
      services: ['trivechaind', 'web'],
      servicesConfig: {
        trivechaind: {
          spawn: {
            datadir: datadir,
            exec: path.resolve(__dirname, datadir, 'trivechaind')
          }
        }
      }
    }
  };
}

module.exports = getDefaultBaseConfig;
