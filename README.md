Trivechaincore Node
============

A Trivechain full node for building applications and services with Node.js. A node is extensible and can be configured to run additional services. At the minimum a node has an interface to [Trivechain Core (trivechaind) v0.13.0](https://github.com/trivechain/trivechain/tree/v0.13.0.x) for more advanced address queries. Additional services can be enabled to make a node more useful such as exposing new APIs, running a block explorer and wallet service.

## Usages

### As a standalone server

```bash
git clone https://github.com/trivechain/trivechaincore-node
cd trivechaincore-node
npm install
./bin/trivechaincore-node start
```

When running the start command, it will seek for a .trivechaincore folder with a trivechaincore-node.json conf file.
If it doesn't exist, it will create it, with basic task to connect to trivechaind.

Some plugins are available :

- Insight-API : `./bin/trivechaincore-node addservice trivechain/insight-api`
- Insight-UI : `./bin/trivechaincore-node addservice trivechain/insight-ui`

You also might want to add these index to your trivechain.conf file :
```
-addressindex
-timestampindex
-spentindex
```

### As a library

```bash
npm install trivechain/trivechaincore-node
```

```javascript
const trivechaincore = require('trivechaincore-node');
const config = require('./trivechaincore-node.json');

let node = trivechaincore.scaffold.start({ path: "", config: config });
node.on('ready', function() {
    //Trivechain core started
    trivechaind.on('tx', function(txData) {
        let tx = new trivechaincore.lib.Transaction(txData);
    });
});
```

## Prerequisites

- Trivechain Core (trivechaind) (v2.1.0) with support for additional indexing *(see above)*
- Node.js v8+
- ZeroMQ *(libzmq3-dev for Ubuntu/Debian or zeromq on OSX)*
- ~20GB of disk storage
- ~1GB of RAM

## Configuration

Trivechaincore includes a Command Line Interface (CLI) for managing, configuring and interfacing with your Trivechaincore Node.

```bash
trivechaincore-node create -d <trivechain-data-dir> mynode
cd mynode
trivechaincore-node install <service>
trivechaincore-node install https://github.com/yourname/helloworld
trivechaincore-node start
```

This will create a directory with configuration files for your node and install the necessary dependencies.

Please note that [Trivechain Core](https://github.com/trivechain/trivechain-core/tree/master) needs to be installed first.

For more information about (and developing) services, please see the [Service Documentation](docs/services.md).

## Add-on Services

There are several add-on services available to extend the functionality of Bitcore:

- [Insight API](https://github.com/trivechain/insight-api/tree/master)
- [Insight UI](https://github.com/trivechain/insight-ui/tree/master)
- [Bitcore Wallet Service](https://github.com/trivechain/trivechaincore-wallet-service/tree/master)

## Documentation

- [Upgrade Notes](docs/upgrade.md)
- [Services](docs/services.md)
  - [Trivechaind](docs/services/trivechaind.md) - Interface to Trivechain Core
  - [Web](docs/services/web.md) - Creates an express application over which services can expose their web/API content
- [Development Environment](docs/development.md) - Guide for setting up a development environment
- [Node](docs/node.md) - Details on the node constructor
- [Bus](docs/bus.md) - Overview of the event bus constructor
- [Release Process](docs/release.md) - Information about verifying a release and the release process.


## Setting up dev environment (with Insight)

Prerequisite : Having a trivechaind node already runing `trivechaind --daemon`.

Trivechaincore-node : `git clone https://github.com/trivechain/trivechaincore-node -b develop`
Insight-api (optional) : `git clone https://github.com/trivechain/insight-api -b develop`
Insight-UI (optional) : `git clone https://github.com/trivechain/insight-ui -b develop`

Install them :
```
cd trivechaincore-node && npm install \
 && cd ../insight-ui && npm install \
 && cd ../insight-api && npm install && cd ..
```

Symbolic linking in parent folder :
```
npm link ../insight-api
npm link ../insight-ui
```

Start with `./bin/trivechaincore-node start` to first generate a ~/.trivechaincore/trivechaincore-node.json file.
Append this file with `"trivechain/insight-ui"` and `"trivechain/insight-api"` in the services array.

## Contributing

Please send pull requests for bug fixes, code optimization, and ideas for improvement. For more information on how to contribute, please refer to our [CONTRIBUTING](https://github.com/trivechain/trivechaincore/blob/master/CONTRIBUTING.md) file.

## License

Code released under [the MIT license](https://github.com/trivechain/trivechaincore-node/blob/master/LICENSE).

Copyright 2018-2019 Trivechain Core Group, Inc.

- bitcoin: Copyright (c) 2009-2015 Bitcoin Core Developers (MIT License)
