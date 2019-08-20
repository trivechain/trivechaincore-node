// jshint ignore: start
'use strict';

var path = require('path');
var EventEmitter = require('events').EventEmitter;
var should = require('chai').should();
var crypto = require('crypto');
var trivechaincore = require('trivechaincore-lib');
var _ = trivechaincore.deps._;
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var fs = require('fs');
var sinon = require('sinon');

var index = require('../../lib');
var log = index.log;
var errors = index.errors;

var Transaction = trivechaincore.Transaction;
var readFileSync = sinon.stub().returns(fs.readFileSync(path.resolve(__dirname, '../data/trivechain.conf')));
var TrivechainService = proxyquire('../../lib/services/trivechaind', {
  fs: {
    readFileSync: readFileSync
  }
});
var defaultTrivechainConf = fs.readFileSync(path.resolve(__dirname, '../data/default.trivechain.conf'), 'utf8');

describe('Trivechain Service', function() {
  var txhex = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0704ffff001d0104ffffffff0100f2052a0100000043410496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858eeac00000000';

  var baseConfig = {
    node: {
      network: trivechaincore.Networks.testnet
    },
    spawn: {
      datadir: 'testdir',
      exec: 'testpath',
    }
  };

  describe('@constructor', function() {
    it('will create an instance', function() {
      var trivechaind = new TrivechainService(baseConfig);
      should.exist(trivechaind);
    });
    it('will create an instance without `new`', function() {
      var trivechaind = TrivechainService(baseConfig);
      should.exist(trivechaind);
    });
    it('will init caches', function() {
      var trivechaind = new TrivechainService(baseConfig);
      should.exist(trivechaind.utxosCache);
      should.exist(trivechaind.txidsCache);
      should.exist(trivechaind.balanceCache);
      should.exist(trivechaind.summaryCache);
      should.exist(trivechaind.transactionDetailedCache);
      should.exist(trivechaind.masternodeListCache);

      should.exist(trivechaind.transactionCache);
      should.exist(trivechaind.rawTransactionCache);
      should.exist(trivechaind.blockCache);
      should.exist(trivechaind.rawBlockCache);
      should.exist(trivechaind.blockHeaderCache);
      should.exist(trivechaind.zmqKnownTransactions);
      should.exist(trivechaind.zmqKnownBlocks);
      should.exist(trivechaind.lastTip);
      should.exist(trivechaind.lastTipTimeout);
    });
    it('will init clients', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.should.deep.equal([]);
      trivechaind.nodesIndex.should.equal(0);
      trivechaind.nodes.push({client: sinon.stub()});
      should.exist(trivechaind.client);
    });
    it('will set subscriptions', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.subscriptions.should.deep.equal({
        address: {},
        rawtransaction: [],
        hashblock: [],
        transactionlock: []
      });
    });
  });

  describe('#_initDefaults', function() {
    it('will set transaction concurrency', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._initDefaults({transactionConcurrency: 10});
      trivechaind.transactionConcurrency.should.equal(10);
      trivechaind._initDefaults({});
      trivechaind.transactionConcurrency.should.equal(5);
    });
  });

  describe('@dependencies', function() {
    it('will have no dependencies', function() {
      TrivechainService.dependencies.should.deep.equal([]);
    });
  });

  describe('#getAPIMethods', function() {
    it('will return spec', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var methods = trivechaind.getAPIMethods();
      should.exist(methods);
      methods.length.should.equal(24);
    });
  });

  describe('#getPublishEvents', function() {
    it('will return spec', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var events = trivechaind.getPublishEvents();
      should.exist(events);
      events.length.should.equal(4);
      events[0].name.should.equal('trivechaind/rawtransaction');
      events[0].scope.should.equal(trivechaind);
      events[0].subscribe.should.be.a('function');
      events[0].unsubscribe.should.be.a('function');
      events[1].name.should.equal('trivechaind/transactionlock');
      events[1].scope.should.equal(trivechaind);
      events[1].subscribe.should.be.a('function');
      events[1].unsubscribe.should.be.a('function');
      events[2].name.should.equal('trivechaind/hashblock');
      events[2].scope.should.equal(trivechaind);
      events[2].subscribe.should.be.a('function');
      events[2].unsubscribe.should.be.a('function');
      events[3].name.should.equal('trivechaind/addresstxid');
      events[3].scope.should.equal(trivechaind);
      events[3].subscribe.should.be.a('function');
      events[3].unsubscribe.should.be.a('function');
    });
    it('will call subscribe/unsubscribe with correct args', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.subscribe = sinon.stub();
      trivechaind.unsubscribe = sinon.stub();
      var events = trivechaind.getPublishEvents();

      events[0].subscribe('test');
      trivechaind.subscribe.args[0][0].should.equal('rawtransaction');
      trivechaind.subscribe.args[0][1].should.equal('test');

      events[0].unsubscribe('test');
      trivechaind.unsubscribe.args[0][0].should.equal('rawtransaction');
      trivechaind.unsubscribe.args[0][1].should.equal('test');

      events[1].subscribe('test');
      trivechaind.subscribe.args[1][0].should.equal('transactionlock');
      trivechaind.subscribe.args[1][1].should.equal('test');

      events[1].unsubscribe('test');
      trivechaind.unsubscribe.args[1][0].should.equal('transactionlock');
      trivechaind.unsubscribe.args[1][1].should.equal('test');

      events[2].subscribe('test');
      trivechaind.subscribe.args[2][0].should.equal('hashblock');
      trivechaind.subscribe.args[2][1].should.equal('test');

      events[2].unsubscribe('test');
      trivechaind.unsubscribe.args[2][0].should.equal('hashblock');
      trivechaind.unsubscribe.args[2][1].should.equal('test');
    });
  });

  describe('#subscribe', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will push to subscriptions', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter = {};
      trivechaind.subscribe('hashblock', emitter);
      trivechaind.subscriptions.hashblock[0].should.equal(emitter);

      var emitter2 = {};
      trivechaind.subscribe('rawtransaction', emitter2);
      trivechaind.subscriptions.rawtransaction[0].should.equal(emitter2);
    });
  });

  describe('#unsubscribe', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will remove item from subscriptions', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = {};
      var emitter2 = {};
      var emitter3 = {};
      var emitter4 = {};
      var emitter5 = {};
      trivechaind.subscribe('hashblock', emitter1);
      trivechaind.subscribe('hashblock', emitter2);
      trivechaind.subscribe('hashblock', emitter3);
      trivechaind.subscribe('hashblock', emitter4);
      trivechaind.subscribe('hashblock', emitter5);
      trivechaind.subscriptions.hashblock.length.should.equal(5);

      trivechaind.unsubscribe('hashblock', emitter3);
      trivechaind.subscriptions.hashblock.length.should.equal(4);
      trivechaind.subscriptions.hashblock[0].should.equal(emitter1);
      trivechaind.subscriptions.hashblock[1].should.equal(emitter2);
      trivechaind.subscriptions.hashblock[2].should.equal(emitter4);
      trivechaind.subscriptions.hashblock[3].should.equal(emitter5);
    });
    it('will not remove item an already unsubscribed item', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = {};
      var emitter3 = {};
      trivechaind.subscriptions.hashblock= [emitter1];
      trivechaind.unsubscribe('hashblock', emitter3);
      trivechaind.subscriptions.hashblock.length.should.equal(1);
      trivechaind.subscriptions.hashblock[0].should.equal(emitter1);
    });
  });

  describe('#subscribeAddress', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will not an invalid address', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter = new EventEmitter();
      trivechaind.subscribeAddress(emitter, ['invalidaddress']);
      should.not.exist(trivechaind.subscriptions.address['invalidaddress']);
    });
    it('will add a valid address', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter = new EventEmitter();
      trivechaind.subscribeAddress(emitter, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      should.exist(trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
    });
    it('will handle multiple address subscribers', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      var emitter2 = new EventEmitter();
      trivechaind.subscribeAddress(emitter1, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.subscribeAddress(emitter2, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      should.exist(trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(2);
    });
    it('will not add the same emitter twice', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      trivechaind.subscribeAddress(emitter1, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.subscribeAddress(emitter1, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      should.exist(trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(1);
    });
  });

  describe('#unsubscribeAddress', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('it will remove a subscription', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      var emitter2 = new EventEmitter();
      trivechaind.subscribeAddress(emitter1, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.subscribeAddress(emitter2, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      should.exist(trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(2);
      trivechaind.unsubscribeAddress(emitter1, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(1);
    });
    it('will unsubscribe subscriptions for an emitter', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      var emitter2 = new EventEmitter();
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'] = [emitter1, emitter2];
      trivechaind.unsubscribeAddress(emitter1);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(1);
    });
    it('will NOT unsubscribe subscription with missing address', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      var emitter2 = new EventEmitter();
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'] = [emitter1, emitter2];
      trivechaind.unsubscribeAddress(emitter1, ['XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs']);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(2);
    });
    it('will NOT unsubscribe subscription with missing emitter', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      var emitter2 = new EventEmitter();
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'] = [emitter2];
      trivechaind.unsubscribeAddress(emitter1, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(1);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'][0].should.equal(emitter2);
    });
    it('will remove empty addresses', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      var emitter2 = new EventEmitter();
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'] = [emitter1, emitter2];
      trivechaind.unsubscribeAddress(emitter1, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      trivechaind.unsubscribeAddress(emitter2, ['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
      should.not.exist(trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi']);
    });
    it('will unsubscribe emitter for all addresses', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      var emitter2 = new EventEmitter();
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'] = [emitter1, emitter2];
      trivechaind.subscriptions.address['XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs'] = [emitter1, emitter2];
      sinon.spy(trivechaind, 'unsubscribeAddressAll');
      trivechaind.unsubscribeAddress(emitter1);
      trivechaind.unsubscribeAddressAll.callCount.should.equal(1);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(1);
      trivechaind.subscriptions.address['XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs'].length.should.equal(1);
    });
  });

  describe('#unsubscribeAddressAll', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will unsubscribe emitter for all addresses', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var emitter1 = new EventEmitter();
      var emitter2 = new EventEmitter();
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'] = [emitter1, emitter2];
      trivechaind.subscriptions.address['XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs'] = [emitter1, emitter2];
      trivechaind.subscriptions.address['mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'] = [emitter2];
      trivechaind.subscriptions.address['7d5169eBcGHF4BYC6DTffTyeCpWbrZnNgz'] = [emitter1];
      trivechaind.unsubscribeAddress(emitter1);
      trivechaind.subscriptions.address['8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi'].length.should.equal(1);
      trivechaind.subscriptions.address['XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs'].length.should.equal(1);
      trivechaind.subscriptions.address['mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'].length.should.equal(1);
      should.not.exist(trivechaind.subscriptions.address['7d5169eBcGHF4BYC6DTffTyeCpWbrZnNgz']);
    });
  });

  describe('#_getDefaultConfig', function() {
    it('will generate config file from defaults', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var config = trivechaind._getDefaultConfig();
      config.should.equal(defaultTrivechainConf);
    });
  });

  describe('#_loadSpawnConfiguration', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will parse a trivechain.conf file', function() {
      var TestTrivechain = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync,
          existsSync: sinon.stub().returns(true),
          writeFileSync: sinon.stub()
        },
        mkdirp: {
          sync: sinon.stub()
        }
      });
      var trivechaind = new TestTrivechain(baseConfig);
      trivechaind.options.spawn.datadir = '/tmp/.trivechain';
      var node = {};
      trivechaind._loadSpawnConfiguration(node);
      should.exist(trivechaind.spawn.config);
      trivechaind.spawn.config.should.deep.equal({
        addressindex: 1,
        checkblocks: 144,
        dbcache: 8192,
        maxuploadtarget: 1024,
        port: 20000,
        rpcport: 50001,
        rpcallowip: '127.0.0.1',
        rpcuser: 'trivechain',
        rpcpassword: 'local321',
        server: 1,
        spentindex: 1,
        timestampindex: 1,
        txindex: 1,
        upnp: 0,
        whitelist: '127.0.0.1',
        zmqpubhashblock: 'tcp://127.0.0.1:28332',
        zmqpubrawtx: 'tcp://127.0.0.1:28332',
        zmqpubrawtxlock: 'tcp://127.0.0.1:28332'
      });
    });
    it('will expand relative datadir to absolute path', function() {
      var TestTrivechain = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync,
          existsSync: sinon.stub().returns(true),
          writeFileSync: sinon.stub()
        },
        mkdirp: {
          sync: sinon.stub()
        }
      });
      var config = {
        node: {
          network: trivechaincore.Networks.testnet,
          configPath: '/tmp/.trivechaincore/trivechaincore-node.json'
        },
        spawn: {
          datadir: './data',
          exec: 'testpath'
        }
      };
      var trivechaind = new TestTrivechain(config);
      trivechaind.options.spawn.datadir = './data';
      var node = {};
      trivechaind._loadSpawnConfiguration(node);
      trivechaind.options.spawn.datadir.should.equal('/tmp/.trivechaincore/data');
    });
    it('should throw an exception if txindex isn\'t enabled in the configuration', function() {
      var TestTrivechain = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: sinon.stub().returns(fs.readFileSync(__dirname + '/../data/badtrivechain.conf')),
          existsSync: sinon.stub().returns(true),
        },
        mkdirp: {
          sync: sinon.stub()
        }
      });
      var trivechaind = new TestTrivechain(baseConfig);
      (function() {
        trivechaind._loadSpawnConfiguration({datadir: './test'});
      }).should.throw(trivechaincore.errors.InvalidState);
    });
    it('should NOT set https options if node https options are set', function() {
      var writeFileSync = function(path, config) {
        config.should.equal(defaultTrivechainConf);
      };
      var TestTrivechain = proxyquire('../../lib/services/trivechaind', {
        fs: {
          writeFileSync: writeFileSync,
          readFileSync: readFileSync,
          existsSync: sinon.stub().returns(false)
        },
        mkdirp: {
          sync: sinon.stub()
        }
      });
      var config = {
        node: {
          network: {
            name: 'regtest'
          },
          https: true,
          httpsOptions: {
            key: 'key.pem',
            cert: 'cert.pem'
          }
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testexec'
        }
      };
      var trivechaind = new TestTrivechain(config);
      trivechaind.options.spawn.datadir = '/tmp/.trivechain';
      var node = {};
      trivechaind._loadSpawnConfiguration(node);
    });
  });

  describe('#_checkConfigIndexes', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'warn');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('should warn the user if reindex is set to 1 in the trivechain.conf file', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var config = {
        txindex: 1,
        addressindex: 1,
        spentindex: 1,
        server: 1,
        zmqpubrawtx: 1,
        zmqpubhashblock: 1,
        zmqpubrawtxlock: 1,
        reindex: 1
      };
      var node = {};
      trivechaind._checkConfigIndexes(config, node);
      log.warn.callCount.should.equal(1);
      node._reindex.should.equal(true);
    });
    it('should warn if zmq port and hosts do not match', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var config = {
        txindex: 1,
        addressindex: 1,
        spentindex: 1,
        server: 1,
        zmqpubrawtx: 'tcp://127.0.0.1:28332',
        zmqpubhashblock: 'tcp://127.0.0.1:28331',
        zmqpubrawtxlock: 'tcp://127.0.0.1:28332',
        reindex: 1
      };
      var node = {};
      (function() {
        trivechaind._checkConfigIndexes(config, node);
      }).should.throw('"zmqpubrawtx" and "zmqpubhashblock"');
    });
  });

  describe('#_resetCaches', function() {
    it('will reset LRU caches', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var keys = [];
      for (var i = 0; i < 10; i++) {
        keys.push(crypto.randomBytes(32));
        trivechaind.transactionDetailedCache.set(keys[i], {});
        trivechaind.utxosCache.set(keys[i], {});
        trivechaind.txidsCache.set(keys[i], {});
        trivechaind.balanceCache.set(keys[i], {});
        trivechaind.summaryCache.set(keys[i], {});
      }
      trivechaind._resetCaches();
      should.equal(trivechaind.transactionDetailedCache.get(keys[0]), undefined);
      should.equal(trivechaind.utxosCache.get(keys[0]), undefined);
      should.equal(trivechaind.txidsCache.get(keys[0]), undefined);
      should.equal(trivechaind.balanceCache.get(keys[0]), undefined);
      should.equal(trivechaind.summaryCache.get(keys[0]), undefined);
    });
  });

  describe('#_tryAllClients', function() {
    it('will retry for each node client', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.tryAllInterval = 1;
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArgWith(0, new Error('test'))
        }
      });
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArgWith(0, new Error('test'))
        }
      });
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArg(0)
        }
      });
      trivechaind._tryAllClients(function(client, next) {
        client.getInfo(next);
      }, function(err) {
        if (err) {
          return done(err);
        }
        trivechaind.nodes[0].client.getInfo.callCount.should.equal(1);
        trivechaind.nodes[1].client.getInfo.callCount.should.equal(1);
        trivechaind.nodes[2].client.getInfo.callCount.should.equal(1);
        done();
      });
    });
    it('will start using the current node index (round-robin)', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.tryAllInterval = 1;
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArgWith(0, new Error('2'))
        }
      });
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArgWith(0, new Error('3'))
        }
      });
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArgWith(0, new Error('1'))
        }
      });
      trivechaind.nodesIndex = 2;
      trivechaind._tryAllClients(function(client, next) {
        client.getInfo(next);
      }, function(err) {
        err.should.be.instanceOf(Error);
        err.message.should.equal('3');
        trivechaind.nodes[0].client.getInfo.callCount.should.equal(1);
        trivechaind.nodes[1].client.getInfo.callCount.should.equal(1);
        trivechaind.nodes[2].client.getInfo.callCount.should.equal(1);
        trivechaind.nodesIndex.should.equal(0);
        done();
      });
    });
    it('will get error if all clients fail', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.tryAllInterval = 1;
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArgWith(0, new Error('test'))
        }
      });
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArgWith(0, new Error('test'))
        }
      });
      trivechaind.nodes.push({
        client: {
          getInfo: sinon.stub().callsArgWith(0, new Error('test'))
        }
      });
      trivechaind._tryAllClients(function(client, next) {
        client.getInfo(next);
      }, function(err) {
        should.exist(err);
        err.should.be.instanceOf(Error);
        err.message.should.equal('test');
        done();
      });
    });
  });

  describe('#_wrapRPCError', function() {
    it('will convert trivechaind-rpc object into JavaScript error', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var error = trivechaind._wrapRPCError({message: 'Test error', code: -1});
      error.should.be.an.instanceof(errors.RPCError);
      error.code.should.equal(-1);
      error.message.should.equal('Test error');
    });
  });

  describe('#_initChain', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will set height and genesis buffer', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var genesisBuffer = new Buffer([]);
      trivechaind.getRawBlock = sinon.stub().callsArgWith(1, null, genesisBuffer);
      trivechaind.nodes.push({
        client: {
          getBestBlockHash: function(callback) {
            callback(null, {
              result: 'bestblockhash'
            });
          },
          getBlock: function(hash, callback) {
            if (hash === 'bestblockhash') {
              callback(null, {
                result: {
                  height: 5000
                }
              });
            }
          },
          getBlockHash: function(num, callback) {
            callback(null, {
              result: 'genesishash'
            });
          }
        }
      });
      trivechaind._initChain(function() {
        log.info.callCount.should.equal(1);
        trivechaind.getRawBlock.callCount.should.equal(1);
        trivechaind.getRawBlock.args[0][0].should.equal('genesishash');
        trivechaind.height.should.equal(5000);
        trivechaind.genesisBuffer.should.equal(genesisBuffer);
        done();
      });
    });
    it('it will handle error from getBestBlockHash', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, {code: -1, message: 'error'});
      trivechaind.nodes.push({
        client: {
          getBestBlockHash: getBestBlockHash
        }
      });
      trivechaind._initChain(function(err) {
        err.should.be.instanceOf(Error);
        done();
      });
    });
    it('it will handle error from getBlock', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, null, {});
      var getBlock = sinon.stub().callsArgWith(1, {code: -1, message: 'error'});
      trivechaind.nodes.push({
        client: {
          getBestBlockHash: getBestBlockHash,
          getBlock: getBlock
        }
      });
      trivechaind._initChain(function(err) {
        err.should.be.instanceOf(Error);
        done();
      });
    });
    it('it will handle error from getBlockHash', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, null, {});
      var getBlock = sinon.stub().callsArgWith(1, null, {
        result: {
          height: 10
        }
      });
      var getBlockHash = sinon.stub().callsArgWith(1, {code: -1, message: 'error'});
      trivechaind.nodes.push({
        client: {
          getBestBlockHash: getBestBlockHash,
          getBlock: getBlock,
          getBlockHash: getBlockHash
        }
      });
      trivechaind._initChain(function(err) {
        err.should.be.instanceOf(Error);
        done();
      });
    });
    it('it will handle error from getRawBlock', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, null, {});
      var getBlock = sinon.stub().callsArgWith(1, null, {
        result: {
          height: 10
        }
      });
      var getBlockHash = sinon.stub().callsArgWith(1, null, {});
      trivechaind.nodes.push({
        client: {
          getBestBlockHash: getBestBlockHash,
          getBlock: getBlock,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getRawBlock = sinon.stub().callsArgWith(1, new Error('test'));
      trivechaind._initChain(function(err) {
        err.should.be.instanceOf(Error);
        done();
      });
    });
  });

  describe('#_getDefaultConf', function() {
    afterEach(function() {
      trivechaincore.Networks.disableRegtest();
      baseConfig.node.network = trivechaincore.Networks.testnet;
    });
    it('will get default rpc port for livenet', function() {
      var config = {
        node: {
          network: trivechaincore.Networks.livenet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      trivechaind._getDefaultConf().rpcport.should.equal(9998);
    });
    it('will get default rpc port for testnet', function() {
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      trivechaind._getDefaultConf().rpcport.should.equal(19998);
    });
    it('will get default rpc port for regtest', function() {
      trivechaincore.Networks.enableRegtest();
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      trivechaind._getDefaultConf().rpcport.should.equal(19998);
    });
  });

  describe('#_getNetworkConfigPath', function() {
    afterEach(function() {
      trivechaincore.Networks.disableRegtest();
      baseConfig.node.network = trivechaincore.Networks.testnet;
    });
    it('will get default config path for livenet', function() {
      var config = {
        node: {
          network: trivechaincore.Networks.livenet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      should.equal(trivechaind._getNetworkConfigPath(), undefined);
    });
    it('will get default rpc port for testnet', function() {
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      trivechaind._getNetworkConfigPath().should.equal('testnet3/trivechain.conf');
    });
    it('will get default rpc port for regtest', function() {
      trivechaincore.Networks.enableRegtest();
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      trivechaind._getNetworkConfigPath().should.equal('regtest/trivechain.conf');
    });
  });

  describe('#_getNetworkOption', function() {
    afterEach(function() {
      trivechaincore.Networks.disableRegtest();
      baseConfig.node.network = trivechaincore.Networks.testnet;
    });
    it('return --testnet for testnet', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.node.network = trivechaincore.Networks.testnet;
      trivechaind._getNetworkOption().should.equal('--testnet');
    });
    it('return --regtest for testnet', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.node.network = trivechaincore.Networks.testnet;
      trivechaincore.Networks.enableRegtest();
      trivechaind._getNetworkOption().should.equal('--regtest');
    });
    it('return undefined for livenet', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.node.network = trivechaincore.Networks.livenet;
      trivechaincore.Networks.enableRegtest();
      should.equal(trivechaind._getNetworkOption(), undefined);
    });
  });

  describe('#_zmqBlockHandler', function() {
    it('will emit block', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var node = {};
      var message = new Buffer('00000000002e08fc7ae9a9aa5380e95e2adcdc5752a4a66a7d3a22466bd4e6aa', 'hex');
      trivechaind._rapidProtectedUpdateTip = sinon.stub();
      trivechaind.on('block', function(block) {
        block.should.equal(message);
        done();
      });
      trivechaind._zmqBlockHandler(node, message);
    });
    it('will not emit same block twice', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var node = {};
      var message = new Buffer('00000000002e08fc7ae9a9aa5380e95e2adcdc5752a4a66a7d3a22466bd4e6aa', 'hex');
      trivechaind._rapidProtectedUpdateTip = sinon.stub();
      trivechaind.on('block', function(block) {
        block.should.equal(message);
        done();
      });
      trivechaind._zmqBlockHandler(node, message);
      trivechaind._zmqBlockHandler(node, message);
    });
    it('will call function to update tip', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var node = {};
      var message = new Buffer('00000000002e08fc7ae9a9aa5380e95e2adcdc5752a4a66a7d3a22466bd4e6aa', 'hex');
      trivechaind._rapidProtectedUpdateTip = sinon.stub();
      trivechaind._zmqBlockHandler(node, message);
      trivechaind._rapidProtectedUpdateTip.callCount.should.equal(1);
      trivechaind._rapidProtectedUpdateTip.args[0][0].should.equal(node);
      trivechaind._rapidProtectedUpdateTip.args[0][1].should.equal(message);
    });
    it('will emit to subscribers', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var node = {};
      var message = new Buffer('00000000002e08fc7ae9a9aa5380e95e2adcdc5752a4a66a7d3a22466bd4e6aa', 'hex');
      trivechaind._rapidProtectedUpdateTip = sinon.stub();
      var emitter = new EventEmitter();
      trivechaind.subscriptions.hashblock.push(emitter);
      emitter.on('trivechaind/hashblock', function(blockHash) {
        blockHash.should.equal(message.toString('hex'));
        done();
      });
      trivechaind._zmqBlockHandler(node, message);
    });
  });

  describe('#_rapidProtectedUpdateTip', function() {
    it('will limit tip updates with rapid calls', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var callCount = 0;
      trivechaind._updateTip = function() {
        callCount++;
        callCount.should.be.within(1, 2);
        if (callCount > 1) {
          done();
        }
      };
      var node = {};
      var message = new Buffer('00000000002e08fc7ae9a9aa5380e95e2adcdc5752a4a66a7d3a22466bd4e6aa', 'hex');
      var count = 0;
      function repeat() {
        trivechaind._rapidProtectedUpdateTip(node, message);
        count++;
        if (count < 50) {
          repeat();
        }
      }
      repeat();
    });
  });

  describe('#_updateTip', function() {
    var sandbox = sinon.sandbox.create();
    var message = new Buffer('00000000002e08fc7ae9a9aa5380e95e2adcdc5752a4a66a7d3a22466bd4e6aa', 'hex');
    beforeEach(function() {
      sandbox.stub(log, 'error');
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('log and emit rpc error from get block', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub();
      trivechaind.on('error', function(err) {
        err.code.should.equal(-1);
        err.message.should.equal('Test error');
        log.error.callCount.should.equal(1);
        done();
      });
      var node = {
        client: {
          getBlock: sinon.stub().callsArgWith(1, {message: 'Test error', code: -1})
        }
      };
      trivechaind._updateTip(node, message);
    });
    it('emit synced if percentage is 100', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub().callsArgWith(0, null, 100);
      trivechaind.on('synced', function() {
        done();
      });
      var node = {
        client: {
          getBlock: sinon.stub()
        }
      };
      trivechaind._updateTip(node, message);
    });
    it('NOT emit synced if percentage is less than 100', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub().callsArgWith(0, null, 99);
      trivechaind.on('synced', function() {
        throw new Error('Synced called');
      });
      var node = {
        client: {
          getBlock: sinon.stub()
        }
      };
      trivechaind._updateTip(node, message);
      log.info.callCount.should.equal(1);
      done();
    });
    it('log and emit error from syncPercentage', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub().callsArgWith(0, new Error('test'));
      trivechaind.on('error', function(err) {
        log.error.callCount.should.equal(1);
        err.message.should.equal('test');
        done();
      });
      var node = {
        client: {
          getBlock: sinon.stub()
        }
      };
      trivechaind._updateTip(node, message);
    });
    it('reset caches and set height', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub();
      trivechaind._resetCaches = sinon.stub();
      trivechaind.on('tip', function(height) {
        trivechaind._resetCaches.callCount.should.equal(1);
        height.should.equal(10);
        trivechaind.height.should.equal(10);
        done();
      });
      var node = {
        client: {
          getBlock: sinon.stub().callsArgWith(1, null, {
            result: {
              height: 10
            }
          })
        }
      };
      trivechaind._updateTip(node, message);
    });
    it('will NOT update twice for the same hash', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub();
      trivechaind._resetCaches = sinon.stub();
      trivechaind.on('tip', function() {
        done();
      });
      var node = {
        client: {
          getBlock: sinon.stub().callsArgWith(1, null, {
            result: {
              height: 10
            }
          })
        }
      };
      trivechaind._updateTip(node, message);
      trivechaind._updateTip(node, message);
    });
    it('will not call syncPercentage if node is stopping', function(done) {
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      trivechaind.syncPercentage = sinon.stub();
      trivechaind._resetCaches = sinon.stub();
      trivechaind.node.stopping = true;
      var node = {
        client: {
          getBlock: sinon.stub().callsArgWith(1, null, {
            result: {
              height: 10
            }
          })
        }
      };
      trivechaind.on('tip', function() {
        trivechaind.syncPercentage.callCount.should.equal(0);
        done();
      });
      trivechaind._updateTip(node, message);
    });
  });

  describe('#_getAddressesFromTransaction', function() {
    it('will get results using trivechaincore.Transaction', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var wif = 'XGLgPK8gbmzU7jcbw34Pj55AXV7SmG6carKuiwtu4WtvTjyTbpwX';
      var privkey = trivechaincore.PrivateKey.fromWIF(wif);
      var inputAddress = privkey.toAddress(trivechaincore.Networks.testnet);
      var outputAddress = trivechaincore.Address('8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi');
      var tx = trivechaincore.Transaction();
      tx.from({
        txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        outputIndex: 0,
        script: trivechaincore.Script(inputAddress),
        address: inputAddress.toString(),
        satoshis: 5000000000
      });
      tx.to(outputAddress, 5000000000);
      tx.sign(privkey);
      var addresses = trivechaind._getAddressesFromTransaction(tx);
      addresses.length.should.equal(2);
      addresses[0].should.equal(inputAddress.toString());
      addresses[1].should.equal(outputAddress.toString());
    });
    it('will handle non-standard script types', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var tx = trivechaincore.Transaction();
      tx.addInput(trivechaincore.Transaction.Input({
        prevTxId: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        script: trivechaincore.Script('OP_TRUE'),
        outputIndex: 1,
        output: {
          script: trivechaincore.Script('OP_TRUE'),
          satoshis: 5000000000
        }
      }));
      tx.addOutput(trivechaincore.Transaction.Output({
        script: trivechaincore.Script('OP_TRUE'),
        satoshis: 5000000000
      }));
      var addresses = trivechaind._getAddressesFromTransaction(tx);
      addresses.length.should.equal(0);
    });
    it('will handle unparsable script types or missing input script', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var tx = trivechaincore.Transaction();
      tx.addOutput(trivechaincore.Transaction.Output({
        script: new Buffer('4c', 'hex'),
        satoshis: 5000000000
      }));
      var addresses = trivechaind._getAddressesFromTransaction(tx);
      addresses.length.should.equal(0);
    });
    it('will return unique values', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var tx = trivechaincore.Transaction();
      var address = trivechaincore.Address('8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi');
      tx.addOutput(trivechaincore.Transaction.Output({
        script: trivechaincore.Script(address),
        satoshis: 5000000000
      }));
      tx.addOutput(trivechaincore.Transaction.Output({
        script: trivechaincore.Script(address),
        satoshis: 5000000000
      }));
      var addresses = trivechaind._getAddressesFromTransaction(tx);
      addresses.length.should.equal(1);
    });
  });

  describe('#_notifyAddressTxidSubscribers', function() {
    it('will emit event if matching addresses', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind._getAddressesFromTransaction = sinon.stub().returns([address]);
      var emitter = new EventEmitter();
      trivechaind.subscriptions.address[address] = [emitter];
      var txid = '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0';
      var transaction = {};
      emitter.on('trivechaind/addresstxid', function(data) {
        data.address.should.equal(address);
        data.txid.should.equal(txid);
        done();
      });
      sinon.spy(emitter, 'emit');
      trivechaind._notifyAddressTxidSubscribers(txid, transaction);
      emitter.emit.callCount.should.equal(1);
    });
    it('will NOT emit event without matching addresses', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind._getAddressesFromTransaction = sinon.stub().returns([address]);
      var emitter = new EventEmitter();
      var txid = '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0';
      var transaction = {};
      emitter.emit = sinon.stub();
      trivechaind._notifyAddressTxidSubscribers(txid, transaction);
      emitter.emit.callCount.should.equal(0);
    });
  });

  describe('#_zmqTransactionHandler', function() {
    it('will emit to subscribers', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedBuffer = new Buffer(txhex, 'hex');
      var emitter = new EventEmitter();
      trivechaind.subscriptions.rawtransaction.push(emitter);
      emitter.on('trivechaind/rawtransaction', function(hex) {
        hex.should.be.a('string');
        hex.should.equal(expectedBuffer.toString('hex'));
        done();
      });
      var node = {};
      trivechaind._zmqTransactionHandler(node, expectedBuffer);
    });
    it('will NOT emit to subscribers more than once for the same tx', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedBuffer = new Buffer(txhex, 'hex');
      var emitter = new EventEmitter();
      trivechaind.subscriptions.rawtransaction.push(emitter);
      emitter.on('trivechaind/rawtransaction', function() {
        done();
      });
      var node = {};
      trivechaind._zmqTransactionHandler(node, expectedBuffer);
      trivechaind._zmqTransactionHandler(node, expectedBuffer);
    });
    it('will emit "tx" event', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedBuffer = new Buffer(txhex, 'hex');
      trivechaind.on('tx', function(buffer) {
        buffer.should.be.instanceof(Buffer);
        buffer.toString('hex').should.equal(expectedBuffer.toString('hex'));
        done();
      });
      var node = {};
      trivechaind._zmqTransactionHandler(node, expectedBuffer);
    });
    it('will NOT emit "tx" event more than once for the same tx', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedBuffer = new Buffer(txhex, 'hex');
      trivechaind.on('tx', function() {
        done();
      });
      var node = {};
      trivechaind._zmqTransactionHandler(node, expectedBuffer);
      trivechaind._zmqTransactionHandler(node, expectedBuffer);
    });
  });

  // TODO: transaction lock test coverage
  describe('#_zmqTransactionLockHandler', function() {
    it('will emit to subscribers', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedBuffer = new Buffer(txhex, 'hex');
      var emitter = new EventEmitter();
      trivechaind.subscriptions.transactionlock.push(emitter);
      emitter.on('trivechaind/transactionlock', function(hex) {
        hex.should.be.a('string');
        hex.should.equal(expectedBuffer.toString('hex'));
        done();
      });
      var node = {};
      trivechaind._zmqTransactionLockHandler(node, expectedBuffer);
    });
    it('will NOT emit to subscribers more than once for the same tx', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedBuffer = new Buffer(txhex, 'hex');
      var emitter = new EventEmitter();
      trivechaind.subscriptions.transactionlock.push(emitter);
      emitter.on('trivechaind/transactionlock', function() {
        done();
      });
      var node = {};
      trivechaind._zmqTransactionLockHandler(node, expectedBuffer);
      trivechaind._zmqTransactionLockHandler(node, expectedBuffer);
    });
    it('will emit "tx" event', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedBuffer = new Buffer(txhex, 'hex');
      trivechaind.on('txlock', function(buffer) {
        buffer.should.be.instanceof(Buffer);
        buffer.toString('hex').should.equal(expectedBuffer.toString('hex'));
        done();
      });
      var node = {};
      trivechaind._zmqTransactionLockHandler(node, expectedBuffer);
    });
    it('will NOT emit "tx" event more than once for the same tx', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedBuffer = new Buffer(txhex, 'hex');
      trivechaind.on('txlock', function() {
        done();
      });
      var node = {};
      trivechaind._zmqTransactionLockHandler(node, expectedBuffer);
      trivechaind._zmqTransactionLockHandler(node, expectedBuffer);
    });
  });

  describe('#_checkSyncedAndSubscribeZmqEvents', function() {
    var sandbox = sinon.sandbox.create();
    before(function() {
      sandbox.stub(log, 'error');
    });
    after(function() {
      sandbox.restore();
    });
    it('log errors, update tip and subscribe to zmq events', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._updateTip = sinon.stub();
      trivechaind._subscribeZmqEvents = sinon.stub();
      var blockEvents = 0;
      trivechaind.on('block', function() {
        blockEvents++;
      });
      var getBestBlockHash = sinon.stub().callsArgWith(0, null, {
        result: '00000000000000001bb82a7f5973618cfd3185ba1ded04dd852a653f92a27c45'
      });
      getBestBlockHash.onCall(0).callsArgWith(0, {code: -1 , message: 'Test error'});
      var progress = 0.90;
      function getProgress() {
        progress = progress + 0.01;
        return progress;
      }
      var info = {};
      Object.defineProperty(info, 'result', {
        get: function() {
          return {
            verificationprogress: getProgress()
          };
        }
      });
      var getBlockchainInfo = sinon.stub().callsArgWith(0, null, info);
      getBlockchainInfo.onCall(0).callsArgWith(0, {code: -1, message: 'Test error'});
      var node = {
        _reindex: true,
        _reindexWait: 1,
        _tipUpdateInterval: 1,
        client: {
          getBestBlockHash: getBestBlockHash,
          getBlockchainInfo: getBlockchainInfo
        }
      };
      trivechaind._checkSyncedAndSubscribeZmqEvents(node);
      setTimeout(function() {
        log.error.callCount.should.equal(2);
        blockEvents.should.equal(11);
        trivechaind._updateTip.callCount.should.equal(11);
        trivechaind._subscribeZmqEvents.callCount.should.equal(1);
        done();
      }, 200);
    });
    it('it will clear interval if node is stopping', function(done) {
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      var getBestBlockHash = sinon.stub().callsArgWith(0, {code: -1, message: 'error'});
      var node = {
        _tipUpdateInterval: 1,
        client: {
          getBestBlockHash: getBestBlockHash
        }
      };
      trivechaind._checkSyncedAndSubscribeZmqEvents(node);
      setTimeout(function() {
        trivechaind.node.stopping = true;
        var count = getBestBlockHash.callCount;
        setTimeout(function() {
          getBestBlockHash.callCount.should.equal(count);
          done();
        }, 100);
      }, 100);
    });
    it('will not set interval if synced is true', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._updateTip = sinon.stub();
      trivechaind._subscribeZmqEvents = sinon.stub();
      var getBestBlockHash = sinon.stub().callsArgWith(0, null, {
        result: '00000000000000001bb82a7f5973618cfd3185ba1ded04dd852a653f92a27c45'
      });
      var info = {
        result: {
          verificationprogress: 1.00
        }
      };
      var getBlockchainInfo = sinon.stub().callsArgWith(0, null, info);
      var node = {
        _tipUpdateInterval: 1,
        client: {
          getBestBlockHash: getBestBlockHash,
          getBlockchainInfo: getBlockchainInfo
        }
      };
      trivechaind._checkSyncedAndSubscribeZmqEvents(node);
      setTimeout(function() {
        getBestBlockHash.callCount.should.equal(1);
        getBlockchainInfo.callCount.should.equal(1);
        done();
      }, 200);
    });
  });

  describe('#_subscribeZmqEvents', function() {
    it('will call subscribe on zmq socket', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var node = {
        zmqSubSocket: {
          subscribe: sinon.stub(),
          on: sinon.stub()
        }
      };
      trivechaind._subscribeZmqEvents(node);
      node.zmqSubSocket.subscribe.callCount.should.equal(3);
      node.zmqSubSocket.subscribe.args[0][0].should.equal('hashblock');
      node.zmqSubSocket.subscribe.args[1][0].should.equal('rawtx');
      node.zmqSubSocket.subscribe.args[2][0].should.equal('rawtxlock');
    });
    it('will call relevant handler for rawtx topics', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._zmqTransactionHandler = sinon.stub();
      var node = {
        zmqSubSocket: new EventEmitter()
      };
      node.zmqSubSocket.subscribe = sinon.stub();
      trivechaind._subscribeZmqEvents(node);
      node.zmqSubSocket.on('message', function() {
        trivechaind._zmqTransactionHandler.callCount.should.equal(1);
        done();
      });
      var topic = new Buffer('rawtx', 'utf8');
      var message = new Buffer('abcdef', 'hex');
      node.zmqSubSocket.emit('message', topic, message);
    });
    it('will call relevant handler for hashblock topics', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._zmqBlockHandler = sinon.stub();
      var node = {
        zmqSubSocket: new EventEmitter()
      };
      node.zmqSubSocket.subscribe = sinon.stub();
      trivechaind._subscribeZmqEvents(node);
      node.zmqSubSocket.on('message', function() {
        trivechaind._zmqBlockHandler.callCount.should.equal(1);
        done();
      });
      var topic = new Buffer('hashblock', 'utf8');
      var message = new Buffer('abcdef', 'hex');
      node.zmqSubSocket.emit('message', topic, message);
    });
    it('will ignore unknown topic types', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._zmqBlockHandler = sinon.stub();
      trivechaind._zmqTransactionHandler = sinon.stub();
      var node = {
        zmqSubSocket: new EventEmitter()
      };
      node.zmqSubSocket.subscribe = sinon.stub();
      trivechaind._subscribeZmqEvents(node);
      node.zmqSubSocket.on('message', function() {
        trivechaind._zmqBlockHandler.callCount.should.equal(0);
        trivechaind._zmqTransactionHandler.callCount.should.equal(0);
        done();
      });
      var topic = new Buffer('unknown', 'utf8');
      var message = new Buffer('abcdef', 'hex');
      node.zmqSubSocket.emit('message', topic, message);
    });
  });

  describe('#_initZmqSubSocket', function() {
    it('will setup zmq socket', function() {
      var socket = new EventEmitter();
      socket.monitor = sinon.stub();
      socket.connect = sinon.stub();
      var socketFunc = function() {
        return socket;
      };
      var TrivechainService = proxyquire('../../lib/services/trivechaind', {
        zeromq: {
          socket: socketFunc
        }
      });
      var trivechaind = new TrivechainService(baseConfig);
      var node = {};
      trivechaind._initZmqSubSocket(node, 'url');
      node.zmqSubSocket.should.equal(socket);
      socket.connect.callCount.should.equal(1);
      socket.connect.args[0][0].should.equal('url');
      socket.monitor.callCount.should.equal(1);
      socket.monitor.args[0][0].should.equal(500);
      socket.monitor.args[0][1].should.equal(0);
    });
  });

  describe('#_checkReindex', function() {
    var sandbox = sinon.sandbox.create();
    before(function() {
      sandbox.stub(log, 'info');
    });
    after(function() {
      sandbox.restore();
    });
    it('give error from client getblockchaininfo', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var node = {
        _reindex: true,
        _reindexWait: 1,
        client: {
          getBlockchainInfo: sinon.stub().callsArgWith(0, {code: -1 , message: 'Test error'})
        }
      };
      trivechaind._checkReindex(node, function(err) {
        should.exist(err);
        err.should.be.instanceof(errors.RPCError);
        done();
      });
    });
    it('will wait until sync is 100 percent', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var percent = 0.89;
      var node = {
        _reindex: true,
        _reindexWait: 1,
        client: {
          getBlockchainInfo: function(callback) {
            percent += 0.01;
            callback(null, {
              result: {
                verificationprogress: percent
              }
            });
          }
        }
      };
      trivechaind._checkReindex(node, function() {
        node._reindex.should.equal(false);
        log.info.callCount.should.equal(11);
        done();
      });
    });
    it('will call callback if reindex is not enabled', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var node = {
        _reindex: false
      };
      trivechaind._checkReindex(node, function() {
        node._reindex.should.equal(false);
        done();
      });
    });
  });

  describe('#_loadTipFromNode', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'warn');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will give rpc from client getbestblockhash', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, {code: -1, message: 'Test error'});
      var node = {
        client: {
          getBestBlockHash: getBestBlockHash
        }
      };
      trivechaind._loadTipFromNode(node, function(err) {
        err.should.be.instanceof(Error);
        log.warn.callCount.should.equal(0);
        done();
      });
    });
    it('will give rpc from client getblock', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, null, {
        result: '00000000000000001bb82a7f5973618cfd3185ba1ded04dd852a653f92a27c45'
      });
      var getBlock = sinon.stub().callsArgWith(1, new Error('Test error'));
      var node = {
        client: {
          getBestBlockHash: getBestBlockHash,
          getBlock: getBlock
        }
      };
      trivechaind._loadTipFromNode(node, function(err) {
        getBlock.args[0][0].should.equal('00000000000000001bb82a7f5973618cfd3185ba1ded04dd852a653f92a27c45');
        err.should.be.instanceof(Error);
        log.warn.callCount.should.equal(0);
        done();
      });
    });
    it('will log when error is RPC_IN_WARMUP', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, {code: -28, message: 'Verifying blocks...'});
      var node = {
        client: {
          getBestBlockHash: getBestBlockHash
        }
      };
      trivechaind._loadTipFromNode(node, function(err) {
        err.should.be.instanceof(Error);
        log.warn.callCount.should.equal(1);
        done();
      });
    });
    it('will set height and emit tip', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, null, {
        result: '00000000000000001bb82a7f5973618cfd3185ba1ded04dd852a653f92a27c45'
      });
      var getBlock = sinon.stub().callsArgWith(1, null, {
        result: {
          height: 100
        }
      });
      var node = {
        client: {
          getBestBlockHash: getBestBlockHash,
          getBlock: getBlock
        }
      };
      trivechaind.on('tip', function(height) {
        height.should.equal(100);
        trivechaind.height.should.equal(100);
        done();
      });
      trivechaind._loadTipFromNode(node, function(err) {
        if (err) {
          return done(err);
        }
      });
    });
  });

  describe('#_stopSpawnedProcess', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'warn');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('it will kill process and resume', function(done) {
      var readFile = sandbox.stub();
      readFile.onCall(0).callsArgWith(2, null, '4321');
      var error = new Error('Test error');
      error.code = 'ENOENT';
      readFile.onCall(1).callsArgWith(2, error);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFile: readFile
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);
      trivechaind.spawnStopTime = 1;
      trivechaind._process = {};
      trivechaind._process.kill = sinon.stub();
      trivechaind._stopSpawnedTrivechain(function(err) {
        if (err) {
          return done(err);
        }
        trivechaind._process.kill.callCount.should.equal(1);
        log.warn.callCount.should.equal(1);
        done();
      });
    });
    it('it will attempt to kill process and resume', function(done) {
      var readFile = sandbox.stub();
      readFile.onCall(0).callsArgWith(2, null, '4321');
      var error = new Error('Test error');
      error.code = 'ENOENT';
      readFile.onCall(1).callsArgWith(2, error);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFile: readFile
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);
      trivechaind.spawnStopTime = 1;
      trivechaind._process = {};
      var error2 = new Error('Test error');
      error2.code = 'ESRCH';
      trivechaind._process.kill = sinon.stub().throws(error2);
      trivechaind._stopSpawnedTrivechain(function(err) {
        if (err) {
          return done(err);
        }
        trivechaind._process.kill.callCount.should.equal(1);
        log.warn.callCount.should.equal(2);
        done();
      });
    });
    it('it will attempt to kill process with NaN', function(done) {
      var readFile = sandbox.stub();
      readFile.onCall(0).callsArgWith(2, null, '     ');
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFile: readFile
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);
      trivechaind.spawnStopTime = 1;
      trivechaind._process = {};
      trivechaind._process.kill = sinon.stub();
      trivechaind._stopSpawnedTrivechain(function(err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });
    it('it will attempt to kill process without pid', function(done) {
      var readFile = sandbox.stub();
      readFile.onCall(0).callsArgWith(2, null, '');
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFile: readFile
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);
      trivechaind.spawnStopTime = 1;
      trivechaind._process = {};
      trivechaind._process.kill = sinon.stub();
      trivechaind._stopSpawnedTrivechain(function(err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });

  describe('#_spawnChildProcess', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
      sandbox.stub(log, 'warn');
      sandbox.stub(log, 'error');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will give error from spawn config', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind._loadSpawnConfiguration = sinon.stub().throws(new Error('test'));
      trivechaind._spawnChildProcess(function(err) {
        err.should.be.instanceof(Error);
        err.message.should.equal('test');
        done();
      });
    });
    it('will give error from stopSpawnedTrivechain', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind._stopSpawnedTrivechain = sinon.stub().callsArgWith(0, new Error('test'));
      trivechaind._spawnChildProcess(function(err) {
        err.should.be.instanceOf(Error);
        err.message.should.equal('test');
      });
    });
    it('will exit spawn if shutdown', function() {
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var process = new EventEmitter();
      var spawn = sinon.stub().returns(process);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync
        },
        child_process: {
          spawn: spawn
        }
      });
      var trivechaind = new TestTrivechainService(config);
      trivechaind.spawn = {};
      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind._stopSpawnedTrivechain = sinon.stub().callsArgWith(0, null);
      trivechaind.node.stopping = true;
      trivechaind._spawnChildProcess(function(err) {
        err.should.be.instanceOf(Error);
        err.message.should.match(/Stopping while trying to spawn/);
      });
    });
    it('will include network with spawn command and init zmq/rpc on node', function(done) {
      var process = new EventEmitter();
      var spawn = sinon.stub().returns(process);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync
        },
        child_process: {
          spawn: spawn
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);

      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind.spawn = {};
      trivechaind.spawn.exec = 'testexec';
      trivechaind.spawn.configPath = 'testdir/trivechain.conf';
      trivechaind.spawn.datadir = 'testdir';
      trivechaind.spawn.config = {};
      trivechaind.spawn.config.rpcport = 20001;
      trivechaind.spawn.config.rpcuser = 'trivechain';
      trivechaind.spawn.config.rpcpassword = 'password';
      trivechaind.spawn.config.zmqpubrawtx = 'tcp://127.0.0.1:30001';
      trivechaind.spawn.config.zmqpubrawtxlock = 'tcp://127.0.0.1:30001';

      trivechaind._loadTipFromNode = sinon.stub().callsArgWith(1, null);
      trivechaind._initZmqSubSocket = sinon.stub();
      trivechaind._checkSyncedAndSubscribeZmqEvents = sinon.stub();
      trivechaind._checkReindex = sinon.stub().callsArgWith(1, null);
      trivechaind._spawnChildProcess(function(err, node) {
        should.not.exist(err);
        spawn.callCount.should.equal(1);
        spawn.args[0][0].should.equal('testexec');
        spawn.args[0][1].should.deep.equal([
          '--conf=testdir/trivechain.conf',
          '--datadir=testdir',
          '--testnet'
        ]);
        spawn.args[0][2].should.deep.equal({
          stdio: 'inherit'
        });
        trivechaind._loadTipFromNode.callCount.should.equal(1);
        trivechaind._initZmqSubSocket.callCount.should.equal(1);
        should.exist(trivechaind._initZmqSubSocket.args[0][0].client);
        trivechaind._initZmqSubSocket.args[0][1].should.equal('tcp://127.0.0.1:30001');
        trivechaind._checkSyncedAndSubscribeZmqEvents.callCount.should.equal(1);
        should.exist(trivechaind._checkSyncedAndSubscribeZmqEvents.args[0][0].client);
        should.exist(node);
        should.exist(node.client);
        done();
      });
    });
    it('will respawn trivechaind spawned process', function(done) {
      var process = new EventEmitter();
      var spawn = sinon.stub().returns(process);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync
        },
        child_process: {
          spawn: spawn
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);
      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind.spawn = {};
      trivechaind.spawn.exec = 'trivechaind';
      trivechaind.spawn.datadir = '/tmp/trivechain';
      trivechaind.spawn.configPath = '/tmp/trivechain/trivechain.conf';
      trivechaind.spawn.config = {};
      trivechaind.spawnRestartTime = 1;
      trivechaind._loadTipFromNode = sinon.stub().callsArg(1);
      trivechaind._initZmqSubSocket = sinon.stub();
      trivechaind._checkReindex = sinon.stub().callsArg(1);
      trivechaind._checkSyncedAndSubscribeZmqEvents = sinon.stub();
      trivechaind._stopSpawnedTrivechain = sinon.stub().callsArg(0);
      sinon.spy(trivechaind, '_spawnChildProcess');
      trivechaind._spawnChildProcess(function(err) {
        if (err) {
          return done(err);
        }
        process.once('exit', function() {
          setTimeout(function() {
            trivechaind._spawnChildProcess.callCount.should.equal(2);
            done();
          }, 5);
        });
        process.emit('exit', 1);
      });
    });
    it('will emit error during respawn', function(done) {
      var process = new EventEmitter();
      var spawn = sinon.stub().returns(process);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync
        },
        child_process: {
          spawn: spawn
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);
      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind.spawn = {};
      trivechaind.spawn.exec = 'trivechaind';
      trivechaind.spawn.datadir = '/tmp/trivechain';
      trivechaind.spawn.configPath = '/tmp/trivechain/trivechain.conf';
      trivechaind.spawn.config = {};
      trivechaind.spawnRestartTime = 1;
      trivechaind._loadTipFromNode = sinon.stub().callsArg(1);
      trivechaind._initZmqSubSocket = sinon.stub();
      trivechaind._checkReindex = sinon.stub().callsArg(1);
      trivechaind._checkSyncedAndSubscribeZmqEvents = sinon.stub();
      trivechaind._stopSpawnedTrivechain = sinon.stub().callsArg(0);
      sinon.spy(trivechaind, '_spawnChildProcess');
      trivechaind._spawnChildProcess(function(err) {
        if (err) {
          return done(err);
        }
        trivechaind._spawnChildProcess = sinon.stub().callsArgWith(0, new Error('test'));
        trivechaind.on('error', function(err) {
          err.should.be.instanceOf(Error);
          err.message.should.equal('test');
          done();
        });
        process.emit('exit', 1);
      });
    });
    it('will NOT respawn trivechaind spawned process if shutting down', function(done) {
      var process = new EventEmitter();
      var spawn = sinon.stub().returns(process);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync
        },
        child_process: {
          spawn: spawn
        }
      });
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TestTrivechainService(config);
      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind.spawn = {};
      trivechaind.spawn.exec = 'trivechaind';
      trivechaind.spawn.datadir = '/tmp/trivechain';
      trivechaind.spawn.configPath = '/tmp/trivechain/trivechain.conf';
      trivechaind.spawn.config = {};
      trivechaind.spawnRestartTime = 1;
      trivechaind._loadTipFromNode = sinon.stub().callsArg(1);
      trivechaind._initZmqSubSocket = sinon.stub();
      trivechaind._checkReindex = sinon.stub().callsArg(1);
      trivechaind._checkSyncedAndSubscribeZmqEvents = sinon.stub();
      trivechaind._stopSpawnedTrivechain = sinon.stub().callsArg(0);
      sinon.spy(trivechaind, '_spawnChildProcess');
      trivechaind._spawnChildProcess(function(err) {
        if (err) {
          return done(err);
        }
        trivechaind.node.stopping = true;
        process.once('exit', function() {
          setTimeout(function() {
            trivechaind._spawnChildProcess.callCount.should.equal(1);
            done();
          }, 5);
        });
        process.emit('exit', 1);
      });
    });
    it('will give error after 60 retries', function(done) {
      var process = new EventEmitter();
      var spawn = sinon.stub().returns(process);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync
        },
        child_process: {
          spawn: spawn
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);
      trivechaind.startRetryInterval = 1;
      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind.spawn = {};
      trivechaind.spawn.exec = 'testexec';
      trivechaind.spawn.configPath = 'testdir/trivechain.conf';
      trivechaind.spawn.datadir = 'testdir';
      trivechaind.spawn.config = {};
      trivechaind.spawn.config.rpcport = 20001;
      trivechaind.spawn.config.rpcuser = 'trivechain';
      trivechaind.spawn.config.rpcpassword = 'password';
      trivechaind.spawn.config.zmqpubrawtx = 'tcp://127.0.0.1:30001';
      trivechaind.spawn.config.zmqpubrawtxlock = 'tcp://127.0.0.1:30001';
      trivechaind._loadTipFromNode = sinon.stub().callsArgWith(1, new Error('test'));
      trivechaind._spawnChildProcess(function(err) {
        trivechaind._loadTipFromNode.callCount.should.equal(60);
        err.should.be.instanceof(Error);
        done();
      });
    });
    it('will give error from check reindex', function(done) {
      var process = new EventEmitter();
      var spawn = sinon.stub().returns(process);
      var TestTrivechainService = proxyquire('../../lib/services/trivechaind', {
        fs: {
          readFileSync: readFileSync
        },
        child_process: {
          spawn: spawn
        }
      });
      var trivechaind = new TestTrivechainService(baseConfig);

      trivechaind._loadSpawnConfiguration = sinon.stub();
      trivechaind.spawn = {};
      trivechaind.spawn.exec = 'testexec';
      trivechaind.spawn.configPath = 'testdir/trivechain.conf';
      trivechaind.spawn.datadir = 'testdir';
      trivechaind.spawn.config = {};
      trivechaind.spawn.config.rpcport = 20001;
      trivechaind.spawn.config.rpcuser = 'trivechain';
      trivechaind.spawn.config.rpcpassword = 'password';
      trivechaind.spawn.config.zmqpubrawtx = 'tcp://127.0.0.1:30001';
      trivechaind.spawn.config.zmqpubrawtxlock = 'tcp://127.0.0.1:30001';

      trivechaind._loadTipFromNode = sinon.stub().callsArgWith(1, null);
      trivechaind._initZmqSubSocket = sinon.stub();
      trivechaind._checkSyncedAndSubscribeZmqEvents = sinon.stub();
      trivechaind._checkReindex = sinon.stub().callsArgWith(1, new Error('test'));

      trivechaind._spawnChildProcess(function(err) {
        err.should.be.instanceof(Error);
        done();
      });
    });
  });

  describe('#_connectProcess', function() {
    it('will give error if connecting while shutting down', function(done) {
      var config = {
        node: {
          network: trivechaincore.Networks.testnet
        },
        spawn: {
          datadir: 'testdir',
          exec: 'testpath'
        }
      };
      var trivechaind = new TrivechainService(config);
      trivechaind.node.stopping = true;
      trivechaind.startRetryInterval = 100;
      trivechaind._loadTipFromNode = sinon.stub();
      trivechaind._connectProcess({}, function(err) {
        err.should.be.instanceof(Error);
        err.message.should.match(/Stopping while trying to connect/);
        trivechaind._loadTipFromNode.callCount.should.equal(0);
        done();
      });
    });
    it('will give error from loadTipFromNode after 60 retries', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._loadTipFromNode = sinon.stub().callsArgWith(1, new Error('test'));
      trivechaind.startRetryInterval = 1;
      var config = {};
      trivechaind._connectProcess(config, function(err) {
        err.should.be.instanceof(Error);
        trivechaind._loadTipFromNode.callCount.should.equal(60);
        done();
      });
    });
    it('will init zmq/rpc on node', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._initZmqSubSocket = sinon.stub();
      trivechaind._subscribeZmqEvents = sinon.stub();
      trivechaind._loadTipFromNode = sinon.stub().callsArgWith(1, null);
      var config = {};
      trivechaind._connectProcess(config, function(err, node) {
        should.not.exist(err);
        trivechaind._loadTipFromNode.callCount.should.equal(1);
        trivechaind._initZmqSubSocket.callCount.should.equal(1);
        trivechaind._loadTipFromNode.callCount.should.equal(1);
        should.exist(node);
        should.exist(node.client);
        done();
      });
    });
  });

  describe('#start', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'info');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('will give error if "spawn" and "connect" are both not configured', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.options = {};
      trivechaind.start(function(err) {
        err.should.be.instanceof(Error);
        err.message.should.match(/Trivechain configuration options/);
      });
      done();
    });
    it('will give error from spawnChildProcess', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._spawnChildProcess = sinon.stub().callsArgWith(0, new Error('test'));
      trivechaind.options = {
        spawn: {}
      };
      trivechaind.start(function(err) {
        err.should.be.instanceof(Error);
        err.message.should.equal('test');
        done();
      });
    });
    it('will give error from connectProcess', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._connectProcess = sinon.stub().callsArgWith(1, new Error('test'));
      trivechaind.options = {
        connect: [
          {}
        ]
      };
      trivechaind.start(function(err) {
        trivechaind._connectProcess.callCount.should.equal(1);
        err.should.be.instanceof(Error);
        err.message.should.equal('test');
        done();
      });
    });
    it('will push node from spawnChildProcess', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var node = {};
      trivechaind._initChain = sinon.stub().callsArg(0);
      trivechaind._spawnChildProcess = sinon.stub().callsArgWith(0, null, node);
      trivechaind.options = {
        spawn: {}
      };
      trivechaind.start(function(err) {
        should.not.exist(err);
        trivechaind.nodes.length.should.equal(1);
        done();
      });
    });
    it('will push node from connectProcess', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._initChain = sinon.stub().callsArg(0);
      var nodes = [{}];
      trivechaind._connectProcess = sinon.stub().callsArgWith(1, null, nodes);
      trivechaind.options = {
        connect: [
          {}
        ]
      };
      trivechaind.start(function(err) {
        should.not.exist(err);
        trivechaind._connectProcess.callCount.should.equal(1);
        trivechaind.nodes.length.should.equal(1);
        done();
      });
    });
  });

  describe('#isSynced', function() {
    it('will give error from syncPercentage', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub().callsArgWith(0, new Error('test'));
      trivechaind.isSynced(function(err) {
        should.exist(err);
        err.message.should.equal('test');
        done();
      });
    });
    it('will give "true" if percentage is 100.00', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub().callsArgWith(0, null, 100.00);
      trivechaind.isSynced(function(err, synced) {
        if (err) {
          return done(err);
        }
        synced.should.equal(true);
        done();
      });
    });
    it('will give "true" if percentage is 99.98', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub().callsArgWith(0, null, 99.98);
      trivechaind.isSynced(function(err, synced) {
        if (err) {
          return done(err);
        }
        synced.should.equal(true);
        done();
      });
    });
    it('will give "false" if percentage is 99.49', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub().callsArgWith(0, null, 99.49);
      trivechaind.isSynced(function(err, synced) {
        if (err) {
          return done(err);
        }
        synced.should.equal(false);
        done();
      });
    });
    it('will give "false" if percentage is 1', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.syncPercentage = sinon.stub().callsArgWith(0, null, 1);
      trivechaind.isSynced(function(err, synced) {
        if (err) {
          return done(err);
        }
        synced.should.equal(false);
        done();
      });
    });
  });

  describe('#syncPercentage', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockchainInfo = sinon.stub().callsArgWith(0, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          getBlockchainInfo: getBlockchainInfo
        }
      });
      trivechaind.syncPercentage(function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });
    it('will call client getInfo and give result', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockchainInfo = sinon.stub().callsArgWith(0, null, {
        result: {
          verificationprogress: '0.983821387'
        }
      });
      trivechaind.nodes.push({
        client: {
          getBlockchainInfo: getBlockchainInfo
        }
      });
      trivechaind.syncPercentage(function(err, percentage) {
        if (err) {
          return done(err);
        }
        percentage.should.equal(98.3821387);
        done();
      });
    });
  });

  describe('#_normalizeAddressArg', function() {
    it('will turn single address into array', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var args = trivechaind._normalizeAddressArg('address');
      args.should.deep.equal(['address']);
    });
    it('will keep an array as an array', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var args = trivechaind._normalizeAddressArg(['address', 'address']);
      args.should.deep.equal(['address', 'address']);
    });
  });

  describe('#getAddressBalance', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressBalance: sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'})
        }
      });
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      var options = {};
      trivechaind.getAddressBalance(address, options, function(err) {
        err.should.be.instanceof(Error);
        done();
      });
    });
    it('will give balance', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getAddressBalance = sinon.stub().callsArgWith(1, null, {
        result: {
          received: 100000,
          balance: 10000
        }
      });
      trivechaind.nodes.push({
        client: {
          getAddressBalance: getAddressBalance
        }
      });
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      var options = {};
      trivechaind.getAddressBalance(address, options, function(err, data) {
        if (err) {
          return done(err);
        }
        data.balance.should.equal(10000);
        data.received.should.equal(100000);
        trivechaind.getAddressBalance(address, options, function(err, data2) {
          if (err) {
            return done(err);
          }
          data2.balance.should.equal(10000);
          data2.received.should.equal(100000);
          getAddressBalance.callCount.should.equal(1);
          done();
        });
      });
    });
  });

  describe('#getAddressUnspentOutputs', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'})
        }
      });
      var options = {
        queryMempool: false
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err) {
        should.exist(err);
        err.should.be.instanceof(errors.RPCError);
        done();
      });
    });
    it('will give results from client getaddressutxos', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedUtxos = [
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 1,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 7679241,
          height: 207111
        }
      ];
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: sinon.stub().callsArgWith(1, null, {
            result: expectedUtxos
          })
        }
      });
      var options = {
        queryMempool: false
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
        if (err) {
          return done(err);
        }
        utxos.length.should.equal(1);
        utxos.should.deep.equal(expectedUtxos);
        done();
      });
    });
    it('will use cache', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var expectedUtxos = [
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 1,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 7679241,
          height: 207111
        }
      ];
      var getAddressUtxos = sinon.stub().callsArgWith(1, null, {
        result: expectedUtxos
      });
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: getAddressUtxos
        }
      });
      var options = {
        queryMempool: false
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
        if (err) {
          return done(err);
        }
        utxos.length.should.equal(1);
        utxos.should.deep.equal(expectedUtxos);
        getAddressUtxos.callCount.should.equal(1);
        trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
          if (err) {
            return done(err);
          }
          utxos.length.should.equal(1);
          utxos.should.deep.equal(expectedUtxos);
          getAddressUtxos.callCount.should.equal(1);
          done();
        });
      });
    });
    it('will update with mempool results', function(done) {
      var deltas = [
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 1
        },
        {
          txid: 'f637384e9f81f18767ea50e00bce58fc9848b6588a1130529eebba22a410155f',
          satoshis: 100000,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342833133
        },
        {
          txid: 'f71bccef3a8f5609c7f016154922adbfe0194a96fb17a798c24077c18d0a9345',
          satoshis: 400000,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 1,
          timestamp: 1461342954813
        }
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var confirmedUtxos = [
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 1,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 7679241,
          height: 207111
        }
      ];
      var expectedUtxos = [
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          outputIndex: 1,
          satoshis: 400000,
          script: '76a914809dc14496f99b6deb722cf46d89d22f4beb8efd88ac',
          timestamp: 1461342954813,
          txid: 'f71bccef3a8f5609c7f016154922adbfe0194a96fb17a798c24077c18d0a9345'
        },
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          outputIndex: 0,
          satoshis: 100000,
          script: '76a914809dc14496f99b6deb722cf46d89d22f4beb8efd88ac',
          timestamp: 1461342833133,
          txid: 'f637384e9f81f18767ea50e00bce58fc9848b6588a1130529eebba22a410155f'
        }
      ];
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: sinon.stub().callsArgWith(1, null, {
            result: confirmedUtxos
          }),
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: deltas
          })
        }
      });
      var options = {
        queryMempool: true
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
        if (err) {
          return done(err);
        }
        utxos.length.should.equal(2);
        utxos.should.deep.equal(expectedUtxos);
        done();
      });
    });
    it('will update with mempool results with multiple outputs', function(done) {
      var deltas = [
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 1
        },
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 1,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 2
        }
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var confirmedUtxos = [
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 1,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 7679241,
          height: 207111
        },
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 2,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 7679241,
          height: 207111
        }
      ];
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: sinon.stub().callsArgWith(1, null, {
            result: confirmedUtxos
          }),
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: deltas
          })
        }
      });
      var options = {
        queryMempool: true
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
        if (err) {
          return done(err);
        }
        utxos.length.should.equal(0);
        done();
      });
    });
    it('three confirmed utxos -> one utxo after mempool', function(done) {
      var deltas = [
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 0
        },
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 1
        },
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 1,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 2
        },
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: 100000,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 1,
          script: '76a914809dc14496f99b6deb722cf46d89d22f4beb8efd88ac',
          timestamp: 1461342833133
        }
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var confirmedUtxos = [
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 0,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 7679241,
          height: 207111
        },
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 1,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 7679241,
          height: 207111
        },
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 2,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 7679241,
          height: 207111
        }
      ];
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: sinon.stub().callsArgWith(1, null, {
            result: confirmedUtxos
          }),
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: deltas
          })
        }
      });
      var options = {
        queryMempool: true
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
        if (err) {
          return done(err);
        }
        utxos.length.should.equal(1);
        done();
      });
    });
    it('spending utxos in the mempool', function(done) {
      var deltas = [
        {
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          satoshis: 7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707724
        },
        {
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          satoshis: 7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 1,
          timestamp: 1461342707724
        },
        {
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          satoshis: 7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          timestamp: 1461342707724,
          index: 2,
        },
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 0
        },
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 1
        },
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: -7679241,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 1,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 2
        },
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: 100000,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 1,
          timestamp: 1461342833133
        }
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var confirmedUtxos = [];
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: sinon.stub().callsArgWith(1, null, {
            result: confirmedUtxos
          }),
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: deltas
          })
        }
      });
      var options = {
        queryMempool: true
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
        if (err) {
          return done(err);
        }
        utxos.length.should.equal(1);
        utxos[0].address.should.equal(address);
        utxos[0].txid.should.equal('e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce');
        utxos[0].outputIndex.should.equal(1);
        utxos[0].script.should.equal('76a914809dc14496f99b6deb722cf46d89d22f4beb8efd88ac');
        utxos[0].timestamp.should.equal(1461342833133);
        done();
      });
    });
    it('will update with mempool results spending zero value output (likely never to happen)', function(done) {
      var deltas = [
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: 0,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707725,
          prevtxid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          prevout: 1
        }
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var confirmedUtxos = [
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 1,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 0,
          height: 207111
        }
      ];
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: sinon.stub().callsArgWith(1, null, {
            result: confirmedUtxos
          }),
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: deltas
          })
        }
      });
      var options = {
        queryMempool: true
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
        if (err) {
          return done(err);
        }
        utxos.length.should.equal(0);
        done();
      });
    });
    it('will not filter results if mempool is not spending', function(done) {
      var deltas = [
        {
          txid: 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          satoshis: 10000,
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          index: 0,
          timestamp: 1461342707725
        }
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var confirmedUtxos = [
        {
          address: 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs',
          txid: '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0',
          outputIndex: 1,
          script: '76a914f399b4b8894f1153b96fce29f05e6e116eb4c21788ac',
          satoshis: 0,
          height: 207111
        }
      ];
      trivechaind.nodes.push({
        client: {
          getAddressUtxos: sinon.stub().callsArgWith(1, null, {
            result: confirmedUtxos
          }),
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: deltas
          })
        }
      });
      var options = {
        queryMempool: true
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err, utxos) {
        if (err) {
          return done(err);
        }
        utxos.length.should.equal(2);
        done();
      });
    });
    it('it will handle error from getAddressMempool', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressMempool: sinon.stub().callsArgWith(1, {code: -1, message: 'test'})
        }
      });
      var options = {
        queryMempool: true
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err) {
        err.should.be.instanceOf(Error);
        done();
      });
    });
    it('should set query mempool if undefined', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getAddressMempool = sinon.stub().callsArgWith(1, {code: -1, message: 'test'});
      trivechaind.nodes.push({
        client: {
          getAddressMempool: getAddressMempool
        }
      });
      var options = {};
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressUnspentOutputs(address, options, function(err) {
        getAddressMempool.callCount.should.equal(1);
        done();
      });
    });
  });

  describe('#_getBalanceFromMempool', function() {
    it('will sum satoshis', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var deltas = [
        {
          satoshis: -1000,
        },
        {
          satoshis: 2000,
        },
        {
          satoshis: -10,
        }
      ];
      var sum = trivechaind._getBalanceFromMempool(deltas);
      sum.should.equal(990);
    });
  });

  describe('#_getTxidsFromMempool', function() {
    it('will filter to txids', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var deltas = [
        {
          txid: 'txid0',
        },
        {
          txid: 'txid1',
        },
        {
          txid: 'txid2',
        }
      ];
      var txids = trivechaind._getTxidsFromMempool(deltas);
      txids.length.should.equal(3);
      txids[0].should.equal('txid0');
      txids[1].should.equal('txid1');
      txids[2].should.equal('txid2');
    });
    it('will not include duplicates', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var deltas = [
        {
          txid: 'txid0',
        },
        {
          txid: 'txid0',
        },
        {
          txid: 'txid1',
        }
      ];
      var txids = trivechaind._getTxidsFromMempool(deltas);
      txids.length.should.equal(2);
      txids[0].should.equal('txid0');
      txids[1].should.equal('txid1');
    });
  });

  describe('#_getHeightRangeQuery', function() {
    it('will detect range query', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var options = {
        start: 20,
        end: 0
      };
      var rangeQuery = trivechaind._getHeightRangeQuery(options);
      rangeQuery.should.equal(true);
    });
    it('will get range properties', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var options = {
        start: 20,
        end: 0
      };
      var clone = {};
      trivechaind._getHeightRangeQuery(options, clone);
      clone.end.should.equal(20);
      clone.start.should.equal(0);
    });
    it('will throw error with invalid range', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var options = {
        start: 0,
        end: 20
      };
      (function() {
        trivechaind._getHeightRangeQuery(options);
      }).should.throw('"end" is expected');
    });
  });

  describe('#getAddressTxids', function() {
    it('will give error from _getHeightRangeQuery', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._getHeightRangeQuery = sinon.stub().throws(new Error('test'));
      trivechaind.getAddressTxids('address', {}, function(err) {
        err.should.be.instanceOf(Error);
        err.message.should.equal('test');
        done();
      });
    });
    it('will give rpc error from mempool query', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressMempool: sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'})
        }
      });
      var options = {};
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressTxids(address, options, function(err) {
        should.exist(err);
        err.should.be.instanceof(errors.RPCError);
      });
    });
    it('will give rpc error from txids query', function() {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressTxids: sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'})
        }
      });
      var options = {
        queryMempool: false
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressTxids(address, options, function(err) {
        should.exist(err);
        err.should.be.instanceof(errors.RPCError);
      });
    });
    it('will get txid results', function(done) {
      var expectedTxids = [
        'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
        'f637384e9f81f18767ea50e00bce58fc9848b6588a1130529eebba22a410155f',
        'f3c1ba3ef86a0420d6102e40e2cfc8682632ab95d09d86a27f5d466b9fa9da47',
        '56fafeb01961831b926558d040c246b97709fd700adcaa916541270583e8e579',
        'bc992ad772eb02864db07ef248d31fb3c6826d25f1153ebf8c79df9b7f70fcf2',
        'f71bccef3a8f5609c7f016154922adbfe0194a96fb17a798c24077c18d0a9345',
        'f35e7e2a2334e845946f3eaca76890d9a68f4393ccc9fe37a0c2fb035f66d2e9',
        'edc080f2084eed362aa488ccc873a24c378dc0979aa29b05767517b70569414a',
        'ed11a08e3102f9610bda44c80c46781d97936a4290691d87244b1b345b39a693',
        'ec94d845c603f292a93b7c829811ac624b76e52b351617ca5a758e9d61a11681'
      ];
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressTxids: sinon.stub().callsArgWith(1, null, {
            result: expectedTxids.reverse()
          })
        }
      });
      var options = {
        queryMempool: false
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressTxids(address, options, function(err, txids) {
        if (err) {
          return done(err);
        }
        txids.length.should.equal(expectedTxids.length);
        txids.should.deep.equal(expectedTxids);
        done();
      });
    });
    it('will get txid results from cache', function(done) {
      var expectedTxids = [
        'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce'
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var getAddressTxids = sinon.stub().callsArgWith(1, null, {
        result: expectedTxids.reverse()
      });
      trivechaind.nodes.push({
        client: {
          getAddressTxids: getAddressTxids
        }
      });
      var options = {
        queryMempool: false
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressTxids(address, options, function(err, txids) {
        if (err) {
          return done(err);
        }
        getAddressTxids.callCount.should.equal(1);
        txids.should.deep.equal(expectedTxids);

        trivechaind.getAddressTxids(address, options, function(err, txids) {
          if (err) {
            return done(err);
          }
          getAddressTxids.callCount.should.equal(1);
          txids.should.deep.equal(expectedTxids);
          done();
        });
      });
    });
    it('will get txid results WITHOUT cache if rangeQuery and exclude mempool', function(done) {
      var expectedTxids = [
        'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce'
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var getAddressMempool = sinon.stub();
      var getAddressTxids = sinon.stub().callsArgWith(1, null, {
        result: expectedTxids.reverse()
      });
      trivechaind.nodes.push({
        client: {
          getAddressTxids: getAddressTxids,
          getAddressMempool: getAddressMempool
        }
      });
      var options = {
        queryMempool: true, // start and end will exclude mempool
        start: 4,
        end: 2
      };
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressTxids(address, options, function(err, txids) {
        if (err) {
          return done(err);
        }
        getAddressTxids.callCount.should.equal(1);
        getAddressMempool.callCount.should.equal(0);
        txids.should.deep.equal(expectedTxids);

        trivechaind.getAddressTxids(address, options, function(err, txids) {
          if (err) {
            return done(err);
          }
          getAddressTxids.callCount.should.equal(2);
          getAddressMempool.callCount.should.equal(0);
          txids.should.deep.equal(expectedTxids);
          done();
        });
      });
    });
    it('will get txid results from cache and live mempool', function(done) {
      var expectedTxids = [
        'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce'
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var getAddressTxids = sinon.stub().callsArgWith(1, null, {
        result: expectedTxids.reverse()
      });
      var getAddressMempool = sinon.stub().callsArgWith(1, null, {
        result: [
          {
            txid: 'bc992ad772eb02864db07ef248d31fb3c6826d25f1153ebf8c79df9b7f70fcf2'
          },
          {
            txid: 'f71bccef3a8f5609c7f016154922adbfe0194a96fb17a798c24077c18d0a9345'
          },
          {
            txid: 'f35e7e2a2334e845946f3eaca76890d9a68f4393ccc9fe37a0c2fb035f66d2e9'
          }
        ]
      });
      trivechaind.nodes.push({
        client: {
          getAddressTxids: getAddressTxids,
          getAddressMempool: getAddressMempool
        }
      });
      var address = 'XnQuJpAgEDNtRwoXWLfuEs69cMgCYS8rgs';
      trivechaind.getAddressTxids(address, {queryMempool: false}, function(err, txids) {
        if (err) {
          return done(err);
        }
        getAddressTxids.callCount.should.equal(1);
        txids.should.deep.equal(expectedTxids);

        trivechaind.getAddressTxids(address, {queryMempool: true}, function(err, txids) {
          if (err) {
            return done(err);
          }
          getAddressTxids.callCount.should.equal(1);
          txids.should.deep.equal([
            'f35e7e2a2334e845946f3eaca76890d9a68f4393ccc9fe37a0c2fb035f66d2e9', // mempool
            'f71bccef3a8f5609c7f016154922adbfe0194a96fb17a798c24077c18d0a9345', // mempool
            'bc992ad772eb02864db07ef248d31fb3c6826d25f1153ebf8c79df9b7f70fcf2', // mempool
            'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce' // confirmed
          ]);
          done();
        });
      });
    });
  });

  describe('#_getConfirmationDetail', function() {
    var sandbox = sinon.sandbox.create();
    beforeEach(function() {
      sandbox.stub(log, 'warn');
    });
    afterEach(function() {
      sandbox.restore();
    });
    it('should get 0 confirmation', function() {
      var tx = new Transaction(txhex);
      tx.height = -1;
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.height = 10;
      var confirmations = trivechaind._getConfirmationsDetail(tx);
      confirmations.should.equal(0);
    });
    it('should get 1 confirmation', function() {
      var tx = new Transaction(txhex);
      tx.height = 10;
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.height = 10;
      var confirmations = trivechaind._getConfirmationsDetail(tx);
      confirmations.should.equal(1);
    });
    it('should get 2 confirmation', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var tx = new Transaction(txhex);
      trivechaind.height = 11;
      tx.height = 10;
      var confirmations = trivechaind._getConfirmationsDetail(tx);
      confirmations.should.equal(2);
    });
    it('should get 0 confirmation with overflow', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var tx = new Transaction(txhex);
      trivechaind.height = 3;
      tx.height = 10;
      var confirmations = trivechaind._getConfirmationsDetail(tx);
      log.warn.callCount.should.equal(1);
      confirmations.should.equal(0);
    });
    it('should get 1000 confirmation', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var tx = new Transaction(txhex);
      trivechaind.height = 1000;
      tx.height = 1;
      var confirmations = trivechaind._getConfirmationsDetail(tx);
      confirmations.should.equal(1000);
    });
  });

  describe('#_getAddressDetailsForInput', function() {
    it('will return if missing an address', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {};
      trivechaind._getAddressDetailsForInput({}, 0, result, []);
      should.not.exist(result.addresses);
      should.not.exist(result.satoshis);
    });
    it('will only add address if it matches', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {};
      trivechaind._getAddressDetailsForInput({
        address: 'address1'
      }, 0, result, ['address2']);
      should.not.exist(result.addresses);
      should.not.exist(result.satoshis);
    });
    it('will instantiate if outputIndexes not defined', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {
        addresses: {}
      };
      trivechaind._getAddressDetailsForInput({
        address: 'address1'
      }, 0, result, ['address1']);
      should.exist(result.addresses);
      result.addresses['address1'].inputIndexes.should.deep.equal([0]);
      result.addresses['address1'].outputIndexes.should.deep.equal([]);
    });
    it('will push to inputIndexes', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {
        addresses: {
          'address1': {
            inputIndexes: [1]
          }
        }
      };
      trivechaind._getAddressDetailsForInput({
        address: 'address1'
      }, 2, result, ['address1']);
      should.exist(result.addresses);
      result.addresses['address1'].inputIndexes.should.deep.equal([1, 2]);
    });
  });

  describe('#_getAddressDetailsForOutput', function() {
    it('will return if missing an address', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {};
      trivechaind._getAddressDetailsForOutput({}, 0, result, []);
      should.not.exist(result.addresses);
      should.not.exist(result.satoshis);
    });
    it('will only add address if it matches', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {};
      trivechaind._getAddressDetailsForOutput({
        address: 'address1'
      }, 0, result, ['address2']);
      should.not.exist(result.addresses);
      should.not.exist(result.satoshis);
    });
    it('will instantiate if outputIndexes not defined', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {
        addresses: {}
      };
      trivechaind._getAddressDetailsForOutput({
        address: 'address1'
      }, 0, result, ['address1']);
      should.exist(result.addresses);
      result.addresses['address1'].inputIndexes.should.deep.equal([]);
      result.addresses['address1'].outputIndexes.should.deep.equal([0]);
    });
    it('will push if outputIndexes defined', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {
        addresses: {
          'address1': {
            outputIndexes: [0]
          }
        }
      };
      trivechaind._getAddressDetailsForOutput({
        address: 'address1'
      }, 1, result, ['address1']);
      should.exist(result.addresses);
      result.addresses['address1'].outputIndexes.should.deep.equal([0, 1]);
    });
  });

  describe('#_getAddressDetailsForTransaction', function() {
    it('will calculate details for the transaction', function(done) {
      /* jshint sub:true */
      var tx = {
        inputs: [
          {
            satoshis: 1000000000,
            address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'
          }
        ],
        outputs: [
          {
            satoshis: 100000000,
            address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'
          },
          {
            satoshis: 200000000,
            address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'
          },
          {
            satoshis: 50000000,
            address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'
          },
          {
            satoshis: 300000000,
            address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'
          },
          {
            satoshis: 349990000,
            address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'
          }
        ],
        locktime: 0
      };
      var trivechaind = new TrivechainService(baseConfig);
      var addresses = ['mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'];
      var details = trivechaind._getAddressDetailsForTransaction(tx, addresses);
      should.exist(details.addresses['mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW']);
      details.addresses['mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'].inputIndexes.should.deep.equal([0]);
      details.addresses['mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'].outputIndexes.should.deep.equal([
        0, 1, 2, 3, 4
      ]);
      details.satoshis.should.equal(-10000);
      done();
    });
  });

  describe('#_getAddressDetailedTransaction', function() {
    it('will get detailed transaction info', function(done) {
      var txid = '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0';
      var tx = {
        height: 20,
      };
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.getDetailedTransaction = sinon.stub().callsArgWith(1, null, tx);
      trivechaind.height = 300;
      var addresses = {};
      trivechaind._getAddressDetailsForTransaction = sinon.stub().returns({
        addresses: addresses,
        satoshis: 1000,
      });
      trivechaind._getAddressDetailedTransaction(txid, {}, function(err, details) {
        if (err) {
          return done(err);
        }
        details.addresses.should.equal(addresses);
        details.satoshis.should.equal(1000);
        details.confirmations.should.equal(281);
        details.tx.should.equal(tx);
        done();
      });
    });
    it('give error from getDetailedTransaction', function(done) {
      var txid = '46f24e0c274fc07708b781963576c4c5d5625d926dbb0a17fa865dcd9fe58ea0';
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.getDetailedTransaction = sinon.stub().callsArgWith(1, new Error('test'));
      trivechaind._getAddressDetailedTransaction(txid, {}, function(err) {
        err.should.be.instanceof(Error);
        done();
      });
    });
  });

  describe('#_getAddressStrings', function() {
    it('will get address strings from trivechaincore addresses', function() {
      var addresses = [
        trivechaincore.Address('XjxDQFjTNEP9dcrJhBLvy5i1Dobz4x1LJN'),
        trivechaincore.Address('7d5169eBcGHF4BYC6DTffTyeCpWbrZnNgz'),
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var strings = trivechaind._getAddressStrings(addresses);
      strings[0].should.equal('XjxDQFjTNEP9dcrJhBLvy5i1Dobz4x1LJN');
      strings[1].should.equal('7d5169eBcGHF4BYC6DTffTyeCpWbrZnNgz');
    });
    it('will get address strings from strings', function() {
      var addresses = [
        'XjxDQFjTNEP9dcrJhBLvy5i1Dobz4x1LJN',
        '7d5169eBcGHF4BYC6DTffTyeCpWbrZnNgz',
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var strings = trivechaind._getAddressStrings(addresses);
      strings[0].should.equal('XjxDQFjTNEP9dcrJhBLvy5i1Dobz4x1LJN');
      strings[1].should.equal('7d5169eBcGHF4BYC6DTffTyeCpWbrZnNgz');
    });
    it('will get address strings from mixture of types', function() {
      var addresses = [
        trivechaincore.Address('XjxDQFjTNEP9dcrJhBLvy5i1Dobz4x1LJN'),
        '7d5169eBcGHF4BYC6DTffTyeCpWbrZnNgz',
      ];
      var trivechaind = new TrivechainService(baseConfig);
      var strings = trivechaind._getAddressStrings(addresses);
      strings[0].should.equal('XjxDQFjTNEP9dcrJhBLvy5i1Dobz4x1LJN');
      strings[1].should.equal('7d5169eBcGHF4BYC6DTffTyeCpWbrZnNgz');
    });
    it('will give error with unknown', function() {
      var addresses = [
        trivechaincore.Address('XjxDQFjTNEP9dcrJhBLvy5i1Dobz4x1LJN'),
        0,
      ];
      var trivechaind = new TrivechainService(baseConfig);
      (function() {
        trivechaind._getAddressStrings(addresses);
      }).should.throw(TypeError);
    });
  });

  describe('#_paginate', function() {
    it('slice txids based on "from" and "to" (3 to 13)', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var txids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      var paginated = trivechaind._paginate(txids, 3, 13);
      paginated.should.deep.equal([3, 4, 5, 6, 7, 8, 9, 10]);
    });
    it('slice txids based on "from" and "to" (0 to 3)', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var txids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      var paginated = trivechaind._paginate(txids, 0, 3);
      paginated.should.deep.equal([0, 1, 2]);
    });
    it('slice txids based on "from" and "to" (0 to 1)', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var txids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      var paginated = trivechaind._paginate(txids, 0, 1);
      paginated.should.deep.equal([0]);
    });
    it('will throw error if "from" is greater than "to"', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var txids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      (function() {
        trivechaind._paginate(txids, 1, 0);
      }).should.throw('"from" (1) is expected to be less than "to"');
    });
    it('will handle string numbers', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var txids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      var paginated = trivechaind._paginate(txids, '1', '3');
      paginated.should.deep.equal([1, 2]);
    });
  });

  describe('#getAddressHistory', function() {
    var address = 'XcHw3hNN293dY1AYrbeBrP1sB6vsugTQTz';
    it('will give error with "from" and "to" range that exceeds max size', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.getAddressHistory(address, {from: 0, to: 51}, function(err) {
        should.exist(err);
        err.message.match(/^\"from/);
        done();
      });
    });
    it('will give error with "from" and "to" order is reversed', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, []);
      trivechaind.getAddressHistory(address, {from: 51, to: 0}, function(err) {
        should.exist(err);
        err.message.match(/^\"from/);
        done();
      });
    });
    it('will give error from _getAddressDetailedTransaction', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, ['txid']);
      trivechaind._getAddressDetailedTransaction = sinon.stub().callsArgWith(2, new Error('test'));
      trivechaind.getAddressHistory(address, {}, function(err) {
        should.exist(err);
        err.message.should.equal('test');
        done();
      });
    });
    it('will give an error if length of addresses is too long', function(done) {
      var addresses = [];
      for (var i = 0; i < 101; i++) {
        addresses.push(address);
      }
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.maxAddressesQuery = 100;
      trivechaind.getAddressHistory(addresses, {}, function(err) {
        should.exist(err);
        err.message.match(/Maximum/);
        done();
      });
    });
    it('give error from getAddressTxids', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, new Error('test'));
      trivechaind.getAddressHistory('address', {}, function(err) {
        should.exist(err);
        err.should.be.instanceof(Error);
        err.message.should.equal('test');
        done();
      });
    });
    it('will paginate', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._getAddressDetailedTransaction = function(txid, options, callback) {
        callback(null, txid);
      };
      var txids = ['one', 'two', 'three', 'four'];
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, txids);
      trivechaind.getAddressHistory('address', {from: 1, to: 3}, function(err, data) {
        if (err) {
          return done(err);
        }
        data.items.length.should.equal(2);
        data.items.should.deep.equal(['two', 'three']);
        done();
      });
    });
  });

  describe('#getAddressSummary', function() {
    var txid1 = '70d9d441d7409aace8e0ffe24ff0190407b2fcb405799a266e0327017288d1f8';
    var txid2 = '35fafaf572341798b2ce2858755afa7c8800bb6b1e885d3e030b81255b5e172d';
    var txid3 = '57b7842afc97a2b46575b490839df46e9273524c6ea59ba62e1e86477cf25247';
    var memtxid1 = 'b1bfa8dbbde790cb46b9763ef3407c1a21c8264b67bfe224f462ec0e1f569e92';
    var memtxid2 = 'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce';
    it('will handle error from getAddressTxids', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: [
              {
                txid: '70d9d441d7409aace8e0ffe24ff0190407b2fcb405799a266e0327017288d1f8',
              }
            ]
          })
        }
      });
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, new Error('test'));
      trivechaind.getAddressBalance = sinon.stub().callsArgWith(2, null, {});
      var address = '';
      var options = {};
      trivechaind.getAddressSummary(address, options, function(err) {
        should.exist(err);
        err.should.be.instanceof(Error);
        err.message.should.equal('test');
        done();
      });
    });
    it('will handle error from getAddressBalance', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: [
              {
                txid: '70d9d441d7409aace8e0ffe24ff0190407b2fcb405799a266e0327017288d1f8',
              }
            ]
          })
        }
      });
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, {});
      trivechaind.getAddressBalance = sinon.stub().callsArgWith(2, new Error('test'), {});
      var address = '';
      var options = {};
      trivechaind.getAddressSummary(address, options, function(err) {
        should.exist(err);
        err.should.be.instanceof(Error);
        err.message.should.equal('test');
        done();
      });
    });
    it('will handle error from client getAddressMempool', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressMempool: sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'})
        }
      });
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, {});
      trivechaind.getAddressBalance = sinon.stub().callsArgWith(2, null, {});
      var address = '';
      var options = {};
      trivechaind.getAddressSummary(address, options, function(err) {
        should.exist(err);
        err.should.be.instanceof(Error);
        err.message.should.equal('Test error');
        done();
      });
    });
    it('should set all properties', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: [
              {
                txid: memtxid1,
                satoshis: -1000000
              },
              {
                txid: memtxid2,
                satoshis: 99999
              }
            ]
          })
        }
      });
      sinon.spy(trivechaind, '_paginate');
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, [txid1, txid2, txid3]);
      trivechaind.getAddressBalance = sinon.stub().callsArgWith(2, null, {
        received: 30 * 1e8,
        balance: 20 * 1e8
      });
      var address = '7oK6xjGeVK5YCT5dpqzNXGUag1bQadPAyT';
      var options = {};
      trivechaind.getAddressSummary(address, options, function(err, summary) {
        trivechaind._paginate.callCount.should.equal(1);
        trivechaind._paginate.args[0][1].should.equal(0);
        trivechaind._paginate.args[0][2].should.equal(1000);
        summary.appearances.should.equal(3);
        summary.totalReceived.should.equal(3000000000);
        summary.totalSpent.should.equal(1000000000);
        summary.balance.should.equal(2000000000);
        summary.unconfirmedAppearances.should.equal(2);
        summary.unconfirmedBalance.should.equal(-900001);
        summary.txids.should.deep.equal([
          'e9dcf22807db77ac0276b03cc2d3a8b03c4837db8ac6650501ef45af1c807cce',
          'b1bfa8dbbde790cb46b9763ef3407c1a21c8264b67bfe224f462ec0e1f569e92',
          '70d9d441d7409aace8e0ffe24ff0190407b2fcb405799a266e0327017288d1f8',
          '35fafaf572341798b2ce2858755afa7c8800bb6b1e885d3e030b81255b5e172d',
          '57b7842afc97a2b46575b490839df46e9273524c6ea59ba62e1e86477cf25247'
        ]);
        done();
      });
    });
    it('will give error with "from" and "to" range that exceeds max size', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: [
              {
                txid: memtxid1,
                satoshis: -1000000
              },
              {
                txid: memtxid2,
                satoshis: 99999
              }
            ]
          })
        }
      });
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, [txid1, txid2, txid3]);
      trivechaind.getAddressBalance = sinon.stub().callsArgWith(2, null, {
        received: 30 * 1e8,
        balance: 20 * 1e8
      });
      var address = '7oK6xjGeVK5YCT5dpqzNXGUag1bQadPAyT';
      var options = {
        from: 0,
        to: 1001
      };
      trivechaind.getAddressSummary(address, options, function(err) {
        should.exist(err);
        err.message.match(/^\"from/);
        done();
      });
    });
    it('will get from cache with noTxList', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getAddressMempool: sinon.stub().callsArgWith(1, null, {
            result: [
              {
                txid: memtxid1,
                satoshis: -1000000
              },
              {
                txid: memtxid2,
                satoshis: 99999
              }
            ]
          })
        }
      });
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, [txid1, txid2, txid3]);
      trivechaind.getAddressBalance = sinon.stub().callsArgWith(2, null, {
        received: 30 * 1e8,
        balance: 20 * 1e8
      });
      var address = '7oK6xjGeVK5YCT5dpqzNXGUag1bQadPAyT';
      var options = {
        noTxList: true
      };
      function checkSummary(summary) {
        summary.appearances.should.equal(3);
        summary.totalReceived.should.equal(3000000000);
        summary.totalSpent.should.equal(1000000000);
        summary.balance.should.equal(2000000000);
        summary.unconfirmedAppearances.should.equal(2);
        summary.unconfirmedBalance.should.equal(-900001);
        should.not.exist(summary.txids);
      }
      trivechaind.getAddressSummary(address, options, function(err, summary) {
        checkSummary(summary);
        trivechaind.getAddressTxids.callCount.should.equal(1);
        trivechaind.getAddressBalance.callCount.should.equal(1);
        trivechaind.getAddressSummary(address, options, function(err, summary) {
          checkSummary(summary);
          trivechaind.getAddressTxids.callCount.should.equal(1);
          trivechaind.getAddressBalance.callCount.should.equal(1);
          done();
        });
      });
    });
    it('will skip querying the mempool with queryMempool set to false', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getAddressMempool = sinon.stub();
      trivechaind.nodes.push({
        client: {
          getAddressMempool: getAddressMempool
        }
      });
      sinon.spy(trivechaind, '_paginate');
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, [txid1, txid2, txid3]);
      trivechaind.getAddressBalance = sinon.stub().callsArgWith(2, null, {
        received: 30 * 1e8,
        balance: 20 * 1e8
      });
      var address = '7oK6xjGeVK5YCT5dpqzNXGUag1bQadPAyT';
      var options = {
        queryMempool: false
      };
      trivechaind.getAddressSummary(address, options, function() {
        getAddressMempool.callCount.should.equal(0);
        done();
      });
    });
    it('will give error from _paginate', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getAddressMempool = sinon.stub();
      trivechaind.nodes.push({
        client: {
          getAddressMempool: getAddressMempool
        }
      });
      sinon.spy(trivechaind, '_paginate');
      trivechaind.getAddressTxids = sinon.stub().callsArgWith(2, null, [txid1, txid2, txid3]);
      trivechaind.getAddressBalance = sinon.stub().callsArgWith(2, null, {
        received: 30 * 1e8,
        balance: 20 * 1e8
      });
      trivechaind._paginate = sinon.stub().throws(new Error('test'));
      var address = '7oK6xjGeVK5YCT5dpqzNXGUag1bQadPAyT';
      var options = {
        queryMempool: false
      };
      trivechaind.getAddressSummary(address, options, function(err) {
        err.should.be.instanceOf(Error);
        err.message.should.equal('test');
        done();
      });
    });
  });

  describe('#getRawBlock', function() {
    var blockhash = '00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b';
    var blockhex = '0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c0101000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000';
    it('will give rcp error from client getblockhash', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getBlockHash: sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'})
        }
      });
      trivechaind.getRawBlock(10, function(err) {
        should.exist(err);
        err.should.be.instanceof(errors.RPCError);
        done();
      });
    });
    it('will give rcp error from client getblock', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getBlock: sinon.stub().callsArgWith(2, {code: -1, message: 'Test error'})
        }
      });
      trivechaind.getRawBlock(blockhash, function(err) {
        should.exist(err);
        err.should.be.instanceof(errors.RPCError);
        done();
      });
    });
    it('will try all nodes for getblock', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockWithError = sinon.stub().callsArgWith(2, {code: -1, message: 'Test error'});
      trivechaind.tryAllInterval = 1;
      trivechaind.nodes.push({
        client: {
          getBlock: getBlockWithError
        }
      });
      trivechaind.nodes.push({
        client: {
          getBlock: getBlockWithError
        }
      });
      trivechaind.nodes.push({
        client: {
          getBlock: sinon.stub().callsArgWith(2, null, {
            result: blockhex
          })
        }
      });
      //cause first call will be not getBlock, but _maybeGetBlockHash, which will set up nodesIndex to 0
      trivechaind.nodesIndex = 2;
      trivechaind.getRawBlock(blockhash, function(err, buffer) {
        if (err) {
          return done(err);
        }
        buffer.should.be.instanceof(Buffer);
        getBlockWithError.callCount.should.equal(2);
        done();
      });
    });
    it('will get block from cache', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlock = sinon.stub().callsArgWith(2, null, {
        result: blockhex
      });
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock
        }
      });
      trivechaind.getRawBlock(blockhash, function(err, buffer) {
        if (err) {
          return done(err);
        }
        buffer.should.be.instanceof(Buffer);
        getBlock.callCount.should.equal(1);
        trivechaind.getRawBlock(blockhash, function(err, buffer) {
          if (err) {
            return done(err);
          }
          buffer.should.be.instanceof(Buffer);
          getBlock.callCount.should.equal(1);
          done();
        });
      });
    });
    it('will get block by height', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlock = sinon.stub().callsArgWith(2, null, {
        result: blockhex
      });
      var getBlockHash = sinon.stub().callsArgWith(1, null, {
        result: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'
      });
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getRawBlock(0, function(err, buffer) {
        if (err) {
          return done(err);
        }
        buffer.should.be.instanceof(Buffer);
        getBlock.callCount.should.equal(1);
        getBlockHash.callCount.should.equal(1);
        done();
      });
    });
  });

  describe('#getBlock', function() {
    var blockhex = '0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c0101000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000';
    it('will give an rpc error from client getblock', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlock = sinon.stub().callsArgWith(2, {code: -1, message: 'Test error'});
      var getBlockHash = sinon.stub().callsArgWith(1, null, {});
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlock(0, function(err) {
        err.should.be.instanceof(Error);
        done();
      });
    });
    it('will give an rpc error from client getblockhash', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHash = sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'});
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlock(0, function(err) {
        err.should.be.instanceof(Error);
        done();
      });
    });
    it('will getblock as trivechaincore object from height', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlock = sinon.stub().callsArgWith(2, null, {
        result: blockhex
      });
      var getBlockHash = sinon.stub().callsArgWith(1, null, {
        result: '00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b'
      });
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlock(0, function(err, block) {
        should.not.exist(err);
        getBlock.args[0][0].should.equal('00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b');
        getBlock.args[0][1].should.equal(false);
        block.should.be.instanceof(trivechaincore.Block);
        done();
      });
    });
    it('will getblock as trivechaincore object', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlock = sinon.stub().callsArgWith(2, null, {
        result: blockhex
      });
      var getBlockHash = sinon.stub();
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlock('00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b', function(err, block) {
        should.not.exist(err);
        getBlockHash.callCount.should.equal(0);
        getBlock.callCount.should.equal(1);
        getBlock.args[0][0].should.equal('00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b');
        getBlock.args[0][1].should.equal(false);
        block.should.be.instanceof(trivechaincore.Block);
        done();
      });
    });
    it('will get block from cache', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlock = sinon.stub().callsArgWith(2, null, {
        result: blockhex
      });
      var getBlockHash = sinon.stub();
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock,
          getBlockHash: getBlockHash
        }
      });
      var hash = '00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b';
      trivechaind.getBlock(hash, function(err, block) {
        should.not.exist(err);
        getBlockHash.callCount.should.equal(0);
        getBlock.callCount.should.equal(1);
        block.should.be.instanceof(trivechaincore.Block);
        trivechaind.getBlock(hash, function(err, block) {
          should.not.exist(err);
          getBlockHash.callCount.should.equal(0);
          getBlock.callCount.should.equal(1);
          block.should.be.instanceof(trivechaincore.Block);
          done();
        });
      });
    });
    it('will get block from cache with height (but not height)', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlock = sinon.stub().callsArgWith(2, null, {
        result: blockhex
      });
      var getBlockHash = sinon.stub().callsArgWith(1, null, {
        result: '00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b'
      });
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlock(0, function(err, block) {
        should.not.exist(err);
        getBlockHash.callCount.should.equal(1);
        getBlock.callCount.should.equal(1);
        block.should.be.instanceof(trivechaincore.Block);
        trivechaind.getBlock(0, function(err, block) {
          should.not.exist(err);
          getBlockHash.callCount.should.equal(2);
          getBlock.callCount.should.equal(1);
          block.should.be.instanceof(trivechaincore.Block);
          done();
        });
      });
    });
  });

  describe('#getBlockHashesByTimestamp', function() {
    it('should give an rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHashes = sinon.stub().callsArgWith(2, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          getBlockHashes: getBlockHashes
        }
      });
      trivechaind.getBlockHashesByTimestamp(1441911000, 1441914000, function(err, hashes) {
        should.exist(err);
        err.message.should.equal('error');
        done();
      });
    });
    it('should get the correct block hashes', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var block1 = '00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b';
      var block2 = '000000000383752a55a0b2891ce018fd0fdc0b6352502772b034ec282b4a1bf6';
      var getBlockHashes = sinon.stub().callsArgWith(2, null, {
        result: [block2, block1]
      });
      trivechaind.nodes.push({
        client: {
          getBlockHashes: getBlockHashes
        }
      });
      trivechaind.getBlockHashesByTimestamp(1441914000, 1441911000, function(err, hashes) {
        should.not.exist(err);
        hashes.should.deep.equal([block2, block1]);
        done();
      });
    });
  });

  describe('#getBlockHeader', function() {
    var blockhash = '00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b';
    it('will give error from getBlockHash', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHash = sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'});
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlockHeader(10, function(err) {
        err.should.be.instanceof(Error);
      });
    });
    it('it will give rpc error from client getblockheader', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHeader = sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'});
      trivechaind.nodes.push({
        client: {
          getBlockHeader: getBlockHeader
        }
      });
      trivechaind.getBlockHeader(blockhash, function(err) {
        err.should.be.instanceof(Error);
      });
    });
    it('it will give rpc error from client getblockhash', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHeader = sinon.stub();
      var getBlockHash = sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'});
      trivechaind.nodes.push({
        client: {
          getBlockHeader: getBlockHeader,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlockHeader(0, function(err) {
        err.should.be.instanceof(Error);
      });
    });
    it('will give result from client getblockheader (from height)', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {
        hash: '0000000000000a817cd3a74aec2f2246b59eb2cbb1ad730213e6c4a1d68ec2f6',
        version: 536870912,
        confirmations: 5,
        height: 828781,
        chainWork: '00000000000000000000000000000000000000000000000ad467352c93bc6a3b',
        prevHash: '0000000000000504235b2aff578a48470dbf6b94dafa9b3703bbf0ed554c9dd9',
        nextHash: '00000000000000eedd967ec155f237f033686f0924d574b946caf1b0e89551b8',
        merkleRoot: '124e0f3fb5aa268f102b0447002dd9700988fc570efcb3e0b5b396ac7db437a9',
        time: 1462979126,
        medianTime: 1462976771,
        nonce: 2981820714,
        bits: '1a13ca10',
        difficulty: 847779.0710240941
      };
      var getBlockHeader = sinon.stub().callsArgWith(1, null, {
        result: {
          hash: '0000000000000a817cd3a74aec2f2246b59eb2cbb1ad730213e6c4a1d68ec2f6',
          version: 536870912,
          confirmations: 5,
          height: 828781,
          chainwork: '00000000000000000000000000000000000000000000000ad467352c93bc6a3b',
          previousblockhash: '0000000000000504235b2aff578a48470dbf6b94dafa9b3703bbf0ed554c9dd9',
          nextblockhash: '00000000000000eedd967ec155f237f033686f0924d574b946caf1b0e89551b8',
          merkleroot: '124e0f3fb5aa268f102b0447002dd9700988fc570efcb3e0b5b396ac7db437a9',
          time: 1462979126,
          mediantime: 1462976771,
          nonce: 2981820714,
          bits: '1a13ca10',
          difficulty: 847779.0710240941
        }
      });
      var getBlockHash = sinon.stub().callsArgWith(1, null, {
        result: blockhash
      });
      trivechaind.nodes.push({
        client: {
          getBlockHeader: getBlockHeader,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlockHeader(0, function(err, blockHeader) {
        should.not.exist(err);
        getBlockHeader.args[0][0].should.equal(blockhash);
        blockHeader.should.deep.equal(result);
      });
    });
    it('will give result from client getblockheader (from hash)', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var result = {
        hash: '0000000000000a817cd3a74aec2f2246b59eb2cbb1ad730213e6c4a1d68ec2f6',
        version: 536870912,
        confirmations: 5,
        height: 828781,
        chainWork: '00000000000000000000000000000000000000000000000ad467352c93bc6a3b',
        prevHash: '0000000000000504235b2aff578a48470dbf6b94dafa9b3703bbf0ed554c9dd9',
        nextHash: '00000000000000eedd967ec155f237f033686f0924d574b946caf1b0e89551b8',
        merkleRoot: '124e0f3fb5aa268f102b0447002dd9700988fc570efcb3e0b5b396ac7db437a9',
        time: 1462979126,
        medianTime: 1462976771,
        nonce: 2981820714,
        bits: '1a13ca10',
        difficulty: 847779.0710240941
      };
      var getBlockHeader = sinon.stub().callsArgWith(1, null, {
        result: {
          hash: '0000000000000a817cd3a74aec2f2246b59eb2cbb1ad730213e6c4a1d68ec2f6',
          version: 536870912,
          confirmations: 5,
          height: 828781,
          chainwork: '00000000000000000000000000000000000000000000000ad467352c93bc6a3b',
          previousblockhash: '0000000000000504235b2aff578a48470dbf6b94dafa9b3703bbf0ed554c9dd9',
          nextblockhash: '00000000000000eedd967ec155f237f033686f0924d574b946caf1b0e89551b8',
          merkleroot: '124e0f3fb5aa268f102b0447002dd9700988fc570efcb3e0b5b396ac7db437a9',
          time: 1462979126,
          mediantime: 1462976771,
          nonce: 2981820714,
          bits: '1a13ca10',
          difficulty: 847779.0710240941
        }
      });
      var getBlockHash = sinon.stub();
      trivechaind.nodes.push({
        client: {
          getBlockHeader: getBlockHeader,
          getBlockHash: getBlockHash
        }
      });
      trivechaind.getBlockHeader(blockhash, function(err, blockHeader) {
        should.not.exist(err);
        getBlockHash.callCount.should.equal(0);
        blockHeader.should.deep.equal(result);
      });
    });
  });

  describe('#getBlockHeaders', function(){
      var blockhash = '00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b';
      it('will gave error from getBlockHash', function(){
          var trivechaind = new TrivechainService(baseConfig);
          var getBlockHash = sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'});
          trivechaind.nodes.push({
              client: {
                  getBlockHash: getBlockHash
              }
          });
          trivechaind.getBlockHeaders(10, function(err) {
              err.should.be.instanceof(Error);
          });
      });
      it('it will give rpc error from client getblockheaders', function() {
          var trivechaind = new TrivechainService(baseConfig);
          var getBlockHeader = sinon.stub().callsArgWith(1, {code: -1, message: 'Test error'});
          trivechaind.nodes.push({
              client: {
                  getBlockHeader: getBlockHeader
              }
          });
          trivechaind.getBlockHeaders(blockhash, function(err){
              err.should.be.instanceof(Error);
          });
      });
      it("will get an array of block headers", function(){
          var trivechaind = new TrivechainService(baseConfig);

          var result = {
              hash: '0000000000000a817cd3a74aec2f2246b59eb2cbb1ad730213e6c4a1d68ec2f6',
              version: 536870912,
              confirmations: 5,
              height: 828781,
              chainWork: '00000000000000000000000000000000000000000000000ad467352c93bc6a3b',
              prevHash: '0000000000000504235b2aff578a48470dbf6b94dafa9b3703bbf0ed554c9dd9',
              nextHash: '00000000000000eedd967ec155f237f033686f0924d574b946caf1b0e89551b8',
              merkleRoot: '124e0f3fb5aa268f102b0447002dd9700988fc570efcb3e0b5b396ac7db437a9',
              time: 1462979126,
              medianTime: 1462976771,
              nonce: 2981820714,
              bits: '1a13ca10',
              difficulty: 847779.0710240941
          };
          var _blockHash = "0000000000004244572caa69779a8e0a6d09fa426856b55cffc1dbc9060cab0d";
          var getBlockHeader = sinon.stub().callsArgWith(1, null, {
              result: {
                  hash: '0000000000004244572caa69779a8e0a6d09fa426856b55cffc1dbc9060cab0d',
                  version: 3,
                  confirmations: 3,
                  height: 596802,
                  size:1011,
                  chainwork: '0000000000000000000000000000000000000000000000013b107cbccb2955f0',
                  previousblockhash: '0000000000002c6816b083abb8cd8d1e2b13181d39e62b456807a4ccecaccf0d',
                  nextblockhash: '00000000000012093f65b9fdba40c4131270a90158864ea422f0ab6acc12ec08',
                  merkleroot: '5aed5d0acabaaea2463f50333f4bebd9b661af1b6cbf620750dead86c53c8a32',
                  tx: [
                      "ad86010c4acfb66d1dd5ce00eeba936396a8a002cc324e7126316e9d48b34a2d",
                      "35ca72c44ae96cab5fe80c22bf72b48324e31242eba7030dec407f0948e6662f",
                      "bfb5c2b60ca73376339185e93b9eac1027655b62da04bacdb502607606598c8d"
                  ],
                  time: 1483290225,
                  nonce: 268203724,
                  bits: '1b00d5dd',
                  difficulty: 78447.12707081
              }
          });
          var getBlockHash = sinon.stub().callsArgWith(1, null, {
              result: "0000000000004244572caa69779a8e0a6d09fa426856b55cffc1dbc9060cab0d"
          });

          var _blockHash2 = "00000000000012093f65b9fdba40c4131270a90158864ea422f0ab6acc12ec08";

          var getBlockHeader2 = sinon.stub().callsArgWith(1, null, {
              result: {
                  hash: '00000000000012093f65b9fdba40c4131270a90158864ea422f0ab6acc12ec08',
                  version: 3,
                  confirmations: 2,
                  height: 596803,
                  size:9004,
                  chainwork: '0000000000000000000000000000000000000000000000013b11b1f8dc564404',
                  previousblockhash: '0000000000004244572caa69779a8e0a6d09fa426856b55cffc1dbc9060cab0d',
                  nextblockhash: '0000000000007dbd3e7b09b457c57436e8f15e76d33768bce1e879678c8699b9',
                  merkleroot: '7e1301c4edd06a61c9081738ef6c704e5b5622680c8a5d6bb9d68f177c645915',
                  tx: [
                      "b0614db089313a5c572cd1b4abd0e7924c6ed8e14092d55f3b1b539935dc1579",
                      "aba6bf61c5eea6a7b215e95f3a881ef259d9b720476c3f3ac453155bbf041d6e",
                      "080acf0b48929bced37bd5bb28217fc0eb98876fc5afbeba9598c641e670dca7",
                      "0ec875ccd7e69cd3c2d44b67b617e4120fdc3447754e6610e75dd2227c9e9b32",
                      "bd0db2ea00c12b31ab21c565f55b0d6534074aced6208d6076219ff35e7fab79",
                      "006a1c7ff5ffc369ee542ba959aad69a993a7923feb60b68e15984dd71c6baa0",
                      "aa41c6780e5f1b54192f97ef11ef5adaf27e15da94f924ffe8317a3e72f00a42"
                  ],
                  time: 1483290547,
                  nonce: 3123079945,
                  bits: '1b00d3ee',
                  difficulty: 79162.85914403
              }
          });
          var getBlockHash2 = sinon.stub().callsArgWith(1, null, {
              result: "00000000000012093f65b9fdba40c4131270a90158864ea422f0ab6acc12ec08"
          });
          trivechaind.nodes.push({
              client: {
                  getBlockHeader: getBlockHeader,
                  getBlockHash: getBlockHash
              }
          });
          trivechaind.nodes.push({
              client: {
                  getBlockHeader: getBlockHeader2,
                  getBlockHash: getBlockHash2
              }
          });

          trivechaind.getBlockHeaders(_blockHash, function(err, blockHeader){
              should.not.exist(err);
              blockHeader[0].hash.should.equal(_blockHash);
              // getBlockHeader.args[0][0].should.equal(blockhash);
              // blockHeader.should.deep.equal(result);
          },5);
      });
  });

  describe('#_maybeGetBlockHash', function() {
    it('will not get block hash with an address', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHash = sinon.stub();
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind._maybeGetBlockHash('8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi', function(err, hash) {
        if (err) {
          return done(err);
        }
        getBlockHash.callCount.should.equal(0);
        hash.should.equal('8oUSpiq5REeEKAzS1qSXoJbZ9TRfH1L6mi');
        done();
      });
    });
    it('will not get block hash with non zero-nine numeric string', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHash = sinon.stub();
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind._maybeGetBlockHash('109a', function(err, hash) {
        if (err) {
          return done(err);
        }
        getBlockHash.callCount.should.equal(0);
        hash.should.equal('109a');
        done();
      });
    });
    it('will get the block hash if argument is a number', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHash = sinon.stub().callsArgWith(1, null, {
        result: 'blockhash'
      });
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind._maybeGetBlockHash(10, function(err, hash) {
        if (err) {
          return done(err);
        }
        hash.should.equal('blockhash');
        getBlockHash.callCount.should.equal(1);
        done();
      });
    });
    it('will get the block hash if argument is a number (as string)', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHash = sinon.stub().callsArgWith(1, null, {
        result: 'blockhash'
      });
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind._maybeGetBlockHash('10', function(err, hash) {
        if (err) {
          return done(err);
        }
        hash.should.equal('blockhash');
        getBlockHash.callCount.should.equal(1);
        done();
      });
    });
    it('will try multiple nodes if one fails', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHash = sinon.stub().callsArgWith(1, null, {
        result: 'blockhash'
      });
      getBlockHash.onCall(0).callsArgWith(1, {code: -1, message: 'test'});
      trivechaind.tryAllInterval = 1;
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind._maybeGetBlockHash(10, function(err, hash) {
        if (err) {
          return done(err);
        }
        hash.should.equal('blockhash');
        getBlockHash.callCount.should.equal(2);
        done();
      });
    });
    it('will give error from getBlockHash', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlockHash = sinon.stub().callsArgWith(1, {code: -1, message: 'test'});
      trivechaind.tryAllInterval = 1;
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind.nodes.push({
        client: {
          getBlockHash: getBlockHash
        }
      });
      trivechaind._maybeGetBlockHash(10, function(err, hash) {
        getBlockHash.callCount.should.equal(2);
        err.should.be.instanceOf(Error);
        err.message.should.equal('test');
        err.code.should.equal(-1);
        done();
      });
    });
  });

  describe('#getBlockOverview', function() {
    var blockhash = '00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b';
    it('will handle error from maybeGetBlockHash', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind._maybeGetBlockHash = sinon.stub().callsArgWith(1, new Error('test'));
      trivechaind.getBlockOverview(blockhash, function(err) {
        err.should.be.instanceOf(Error);
        done();
      });
    });
    it('will give error from client.getBlock', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBlock = sinon.stub().callsArgWith(2, {code: -1, message: 'test'});
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock
        }
      });
      trivechaind.getBlockOverview(blockhash, function(err) {
        err.should.be.instanceOf(Error);
        err.message.should.equal('test');
        done();
      });
    });
    it('will give expected result', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var blockResult = {
        hash: blockhash,
        version: 536870912,
        confirmations: 5,
        height: 828781,
        chainwork: '00000000000000000000000000000000000000000000000ad467352c93bc6a3b',
        previousblockhash: '0000000000000504235b2aff578a48470dbf6b94dafa9b3703bbf0ed554c9dd9',
        nextblockhash: '00000000000000eedd967ec155f237f033686f0924d574b946caf1b0e89551b8',
        merkleroot: '124e0f3fb5aa268f102b0447002dd9700988fc570efcb3e0b5b396ac7db437a9',
        time: 1462979126,
        mediantime: 1462976771,
        nonce: 2981820714,
        bits: '1a13ca10',
        difficulty: 847779.0710240941
      };
      var getBlock = sinon.stub().callsArgWith(2, null, {
        result: blockResult
      });
      trivechaind.nodes.push({
        client: {
          getBlock: getBlock
        }
      });
      function checkBlock(blockOverview) {
        blockOverview.hash.should.equal('00000000050a6d07f583beba2d803296eb1e9d4980c4a20f206c584e89a4f02b');
        blockOverview.version.should.equal(536870912);
        blockOverview.confirmations.should.equal(5);
        blockOverview.height.should.equal(828781);
        blockOverview.chainWork.should.equal('00000000000000000000000000000000000000000000000ad467352c93bc6a3b');
        blockOverview.prevHash.should.equal('0000000000000504235b2aff578a48470dbf6b94dafa9b3703bbf0ed554c9dd9');
        blockOverview.nextHash.should.equal('00000000000000eedd967ec155f237f033686f0924d574b946caf1b0e89551b8');
        blockOverview.merkleRoot.should.equal('124e0f3fb5aa268f102b0447002dd9700988fc570efcb3e0b5b396ac7db437a9');
        blockOverview.time.should.equal(1462979126);
        blockOverview.medianTime.should.equal(1462976771);
        blockOverview.nonce.should.equal(2981820714);
        blockOverview.bits.should.equal('1a13ca10');
        blockOverview.difficulty.should.equal(847779.0710240941);
      }
      trivechaind.getBlockOverview(blockhash, function(err, blockOverview) {
        if (err) {
          return done(err);
        }
        checkBlock(blockOverview);
        trivechaind.getBlockOverview(blockhash, function(err, blockOverview) {
          checkBlock(blockOverview);
          getBlock.callCount.should.equal(1);
          done();
        });
      });
    });
  });

  describe('#estimateFee', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var estimateFee = sinon.stub().callsArgWith(1, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          estimateFee: estimateFee
        }
      });
      trivechaind.estimateFee(1, function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });
    it('will call client estimateFee and give result', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var estimateFee = sinon.stub().callsArgWith(1, null, {
        result: -1
      });
      trivechaind.nodes.push({
        client: {
          estimateFee: estimateFee
        }
      });
      trivechaind.estimateFee(1, function(err, feesPerKb) {
        if (err) {
          return done(err);
        }
        feesPerKb.should.equal(-1);
        done();
      });
    });
  });

  describe('#sendTransaction', function(done) {
    var tx = trivechaincore.Transaction(txhex);
    it('will give rpc error', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var sendRawTransaction = sinon.stub().callsArgWith(3, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          sendRawTransaction: sendRawTransaction
        }
      });
      trivechaind.sendTransaction(txhex, function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
      });
    });
    it('will send to client and get hash', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var sendRawTransaction = sinon.stub().callsArgWith(3, null, {
        result: tx.hash
      });
      trivechaind.nodes.push({
        client: {
          sendRawTransaction: sendRawTransaction
        }
      });
      trivechaind.sendTransaction(txhex, function(err, hash) {
        if (err) {
          return done(err);
        }
        hash.should.equal(tx.hash);
      });
    });
    it('will send to client with absurd fees and get hash', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var sendRawTransaction = sinon.stub().callsArgWith(3, null, {
        result: tx.hash
      });
      trivechaind.nodes.push({
        client: {
          sendRawTransaction: sendRawTransaction
        }
      });
      trivechaind.sendTransaction(txhex, {allowAbsurdFees: true}, function(err, hash) {
        if (err) {
          return done(err);
        }
        hash.should.equal(tx.hash);
      });
    });
    it('missing callback will throw error', function() {
      var trivechaind = new TrivechainService(baseConfig);
      var sendRawTransaction = sinon.stub().callsArgWith(3, null, {
        result: tx.hash
      });
      trivechaind.nodes.push({
        client: {
          sendRawTransaction: sendRawTransaction
        }
      });
      var transaction = trivechaincore.Transaction();
      (function() {
        trivechaind.sendTransaction(transaction);
      }).should.throw(Error);
    });
  });

  describe('#getRawTransaction', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getRawTransaction = sinon.stub().callsArgWith(1, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransaction
        }
      });
      trivechaind.getRawTransaction('txid', function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });
    it('will try all nodes', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.tryAllInterval = 1;
      var getRawTransactionWithError = sinon.stub().callsArgWith(1, {message: 'error', code: -1});
      var getRawTransaction = sinon.stub().callsArgWith(1, null, {
        result: txhex
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransactionWithError
        }
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransactionWithError
        }
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransaction
        }
      });
      trivechaind.getRawTransaction('txid', function(err, tx) {
        if (err) {
          return done(err);
        }
        should.exist(tx);
        tx.should.be.an.instanceof(Buffer);
        done();
      });
    });
    it('will get from cache', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getRawTransaction = sinon.stub().callsArgWith(1, null, {
        result: txhex
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransaction
        }
      });
      trivechaind.getRawTransaction('txid', function(err, tx) {
        if (err) {
          return done(err);
        }
        should.exist(tx);
        tx.should.be.an.instanceof(Buffer);

        trivechaind.getRawTransaction('txid', function(err, tx) {
          should.exist(tx);
          tx.should.be.an.instanceof(Buffer);
          getRawTransaction.callCount.should.equal(1);
          done();
        });
      });
    });
  });

  describe('#getTransaction', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getRawTransaction = sinon.stub().callsArgWith(1, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransaction
        }
      });
      trivechaind.getTransaction('txid', function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });
    it('will try all nodes', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.tryAllInterval = 1;
      var getRawTransactionWithError = sinon.stub().callsArgWith(1, {message: 'error', code: -1});
      var getRawTransaction = sinon.stub().callsArgWith(1, null, {
        result: txhex
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransactionWithError
        }
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransactionWithError
        }
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransaction
        }
      });
      trivechaind.getTransaction('txid', function(err, tx) {
        if (err) {
          return done(err);
        }
        should.exist(tx);
        tx.should.be.an.instanceof(trivechaincore.Transaction);
        done();
      });
    });
    it('will get from cache', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getRawTransaction = sinon.stub().callsArgWith(1, null, {
        result: txhex
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransaction
        }
      });
      trivechaind.getTransaction('txid', function(err, tx) {
        if (err) {
          return done(err);
        }
        should.exist(tx);
        tx.should.be.an.instanceof(trivechaincore.Transaction);

        trivechaind.getTransaction('txid', function(err, tx) {
          should.exist(tx);
          tx.should.be.an.instanceof(trivechaincore.Transaction);
          getRawTransaction.callCount.should.equal(1);
          done();
        });

      });
    });
  });

  describe('#getDetailedTransaction', function() {
    var txBuffer = new Buffer('01000000016f95980911e01c2c664b3e78299527a47933aac61a515930a8fe0213d1ac9abe01000000da0047304402200e71cda1f71e087c018759ba3427eb968a9ea0b1decd24147f91544629b17b4f0220555ee111ed0fc0f751ffebf097bdf40da0154466eb044e72b6b3dcd5f06807fa01483045022100c86d6c8b417bff6cc3bbf4854c16bba0aaca957e8f73e19f37216e2b06bb7bf802205a37be2f57a83a1b5a8cc511dc61466c11e9ba053c363302e7b99674be6a49fc0147522102632178d046673c9729d828cfee388e121f497707f810c131e0d3fc0fe0bd66d62103a0951ec7d3a9da9de171617026442fcd30f34d66100fab539853b43f508787d452aeffffffff0240420f000000000017a9148a31d53a448c18996e81ce67811e5fb7da21e4468738c9d6f90000000017a9148ce5408cfeaddb7ccb2545ded41ef478109454848700000000', 'hex');
    var info = {
      blockHash: '00000000000ec715852ea2ecae4dc8563f62d603c820f81ac284cd5be0a944d6',
      height: 530482,
      timestamp: 1439559434000,
      buffer: txBuffer
    };
    var rpcRawTransaction = {
      hex: txBuffer.toString('hex'),
      blockhash: info.blockHash,
      height: info.height,
      version: 1,
      locktime: 411451,
      time: info.timestamp,
      vin: [
        {
          valueSat: 110,
          address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW',
          txid: '3d003413c13eec3fa8ea1fe8bbff6f40718c66facffe2544d7516c9e2900cac2',
          sequence: 0xFFFFFFFF,
          vout: 0,
          scriptSig: {
            hex: 'scriptSigHex',
            asm: 'scriptSigAsm'
          }
        }
      ],
      vout: [
        {
          spentTxId: '4316b98e7504073acd19308b4b8c9f4eeb5e811455c54c0ebfe276c0b1eb6315',
          spentIndex: 2,
          spentHeight: 100,
          valueSat: 100,
          scriptPubKey: {
            hex: '76a9140b2f0a0c31bfe0406b0ccc1381fdbe311946dadc88ac',
            asm: 'OP_DUP OP_HASH160 0b2f0a0c31bfe0406b0ccc1381fdbe311946dadc OP_EQUALVERIFY OP_CHECKSIG',
            addresses: ['mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW']
          }
        }
      ]
    };
    it('should give a transaction with height and timestamp', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.nodes.push({
        client: {
          getRawTransaction: sinon.stub().callsArgWith(2, {code: -1, message: 'Test error'})
        }
      });
      var txid = '2d950d00494caf6bfc5fff2a3f839f0eb50f663ae85ce092bc5f9d45296ae91f';
      trivechaind.getDetailedTransaction(txid, function(err) {
        should.exist(err);
        err.should.be.instanceof(errors.RPCError);
        done();
      });
    });
    it('should give a transaction with all properties', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getRawTransaction = sinon.stub().callsArgWith(2, null, {
        result: rpcRawTransaction
      });
      trivechaind.nodes.push({
        client: {
          getRawTransaction: getRawTransaction
        }
      });
      var txid = '2d950d00494caf6bfc5fff2a3f839f0eb50f663ae85ce092bc5f9d45296ae91f';
      function checkTx(tx) {
        /* jshint maxstatements: 30 */
        should.exist(tx);
        should.not.exist(tx.coinbase);
        should.equal(tx.hex, txBuffer.toString('hex'));
        should.equal(tx.blockHash, '00000000000ec715852ea2ecae4dc8563f62d603c820f81ac284cd5be0a944d6');
        should.equal(tx.height, 530482);
        should.equal(tx.blockTimestamp, 1439559434000);
        should.equal(tx.version, 1);
        should.equal(tx.locktime, 411451);
        should.equal(tx.feeSatoshis, 10);
        should.equal(tx.inputSatoshis, 110);
        should.equal(tx.outputSatoshis, 100);
        should.equal(tx.hash, txid);
        var input = tx.inputs[0];
        should.equal(input.prevTxId, '3d003413c13eec3fa8ea1fe8bbff6f40718c66facffe2544d7516c9e2900cac2');
        should.equal(input.outputIndex, 0);
        should.equal(input.satoshis, 110);
        should.equal(input.sequence, 0xFFFFFFFF);
        should.equal(input.script, 'scriptSigHex');
        should.equal(input.scriptAsm, 'scriptSigAsm');
        should.equal(input.address, 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW');
        var output = tx.outputs[0];
        should.equal(output.satoshis, 100);
        should.equal(output.script, '76a9140b2f0a0c31bfe0406b0ccc1381fdbe311946dadc88ac');
        should.equal(output.scriptAsm, 'OP_DUP OP_HASH160 0b2f0a0c31bfe0406b0ccc1381fdbe311946dadc OP_EQUALVERIFY OP_CHECKSIG');
        should.equal(output.address, 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW');
        should.equal(output.spentTxId, '4316b98e7504073acd19308b4b8c9f4eeb5e811455c54c0ebfe276c0b1eb6315');
        should.equal(output.spentIndex, 2);
        should.equal(output.spentHeight, 100);
      }
      trivechaind.getDetailedTransaction(txid, function(err, tx) {
        if (err) {
          return done(err);
        }
        checkTx(tx);
        trivechaind.getDetailedTransaction(txid, function(err, tx) {
          if (err) {
            return done(err);
          }
          checkTx(tx);
          getRawTransaction.callCount.should.equal(1);
          done();
        });
      });
    });
    it('should set coinbase to true', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var rawTransaction = JSON.parse((JSON.stringify(rpcRawTransaction)));
      delete rawTransaction.vin[0];
      rawTransaction.vin = [
        {
          coinbase: 'abcdef'
        }
      ];
      trivechaind.nodes.push({
        client: {
          getRawTransaction: sinon.stub().callsArgWith(2, null, {
            result: rawTransaction
          })
        }
      });
      var txid = '2d950d00494caf6bfc5fff2a3f839f0eb50f663ae85ce092bc5f9d45296ae91f';
      trivechaind.getDetailedTransaction(txid, function(err, tx) {
        should.exist(tx);
        should.equal(tx.coinbase, true);
        done();
      });
    });
    it('will not include address if address length is zero', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var rawTransaction = JSON.parse((JSON.stringify(rpcRawTransaction)));
      rawTransaction.vout[0].scriptPubKey.addresses = [];
      trivechaind.nodes.push({
        client: {
          getRawTransaction: sinon.stub().callsArgWith(2, null, {
            result: rawTransaction
          })
        }
      });
      var txid = '2d950d00494caf6bfc5fff2a3f839f0eb50f663ae85ce092bc5f9d45296ae91f';
      trivechaind.getDetailedTransaction(txid, function(err, tx) {
        should.exist(tx);
        should.equal(tx.outputs[0].address, null);
        done();
      });
    });
    it('will not include address if address length is greater than 1', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var rawTransaction = JSON.parse((JSON.stringify(rpcRawTransaction)));
      rawTransaction.vout[0].scriptPubKey.addresses = ['one', 'two'];
      trivechaind.nodes.push({
        client: {
          getRawTransaction: sinon.stub().callsArgWith(2, null, {
            result: rawTransaction
          })
        }
      });
      var txid = '2d950d00494caf6bfc5fff2a3f839f0eb50f663ae85ce092bc5f9d45296ae91f';
      trivechaind.getDetailedTransaction(txid, function(err, tx) {
        should.exist(tx);
        should.equal(tx.outputs[0].address, null);
        done();
      });
    });
    it('will handle scriptPubKey.addresses not being set', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var rawTransaction = JSON.parse((JSON.stringify(rpcRawTransaction)));
      delete rawTransaction.vout[0].scriptPubKey['addresses'];
      trivechaind.nodes.push({
        client: {
          getRawTransaction: sinon.stub().callsArgWith(2, null, {
            result: rawTransaction
          })
        }
      });
      var txid = '2d950d00494caf6bfc5fff2a3f839f0eb50f663ae85ce092bc5f9d45296ae91f';
      trivechaind.getDetailedTransaction(txid, function(err, tx) {
        should.exist(tx);
        should.equal(tx.outputs[0].address, null);
        done();
      });
    });
    it('will not include script if input missing scriptSig or coinbase', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var rawTransaction = JSON.parse((JSON.stringify(rpcRawTransaction)));
      delete rawTransaction.vin[0].scriptSig;
      delete rawTransaction.vin[0].coinbase;
      trivechaind.nodes.push({
        client: {
          getRawTransaction: sinon.stub().callsArgWith(2, null, {
            result: rawTransaction
          })
        }
      });
      var txid = '2d950d00494caf6bfc5fff2a3f839f0eb50f663ae85ce092bc5f9d45296ae91f';
      trivechaind.getDetailedTransaction(txid, function(err, tx) {
        should.exist(tx);
        should.equal(tx.inputs[0].script, null);
        done();
      });
    });
    it('will set height to -1 if missing height', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var rawTransaction = JSON.parse((JSON.stringify(rpcRawTransaction)));
      delete rawTransaction.height;
      trivechaind.nodes.push({
        client: {
          getRawTransaction: sinon.stub().callsArgWith(2, null, {
            result: rawTransaction
          })
        }
      });
      var txid = '2d950d00494caf6bfc5fff2a3f839f0eb50f663ae85ce092bc5f9d45296ae91f';
      trivechaind.getDetailedTransaction(txid, function(err, tx) {
        should.exist(tx);
        should.equal(tx.height, -1);
        done();
      });
    });
  });

  describe('#getBestBlockHash', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          getBestBlockHash: getBestBlockHash
        }
      });
      trivechaind.getBestBlockHash(function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });
    it('will call client getInfo and give result', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getBestBlockHash = sinon.stub().callsArgWith(0, null, {
        result: 'besthash'
      });
      trivechaind.nodes.push({
        client: {
          getBestBlockHash: getBestBlockHash
        }
      });
      trivechaind.getBestBlockHash(function(err, hash) {
        if (err) {
          return done(err);
        }
        should.exist(hash);
        hash.should.equal('besthash');
        done();
      });
    });
  });

  describe('#getSpentInfo', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getSpentInfo = sinon.stub().callsArgWith(1, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          getSpentInfo: getSpentInfo
        }
      });
      trivechaind.getSpentInfo({}, function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });
    it('will empty object when not found', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getSpentInfo = sinon.stub().callsArgWith(1, {message: 'test', code: -5});
      trivechaind.nodes.push({
        client: {
          getSpentInfo: getSpentInfo
        }
      });
      trivechaind.getSpentInfo({}, function(err, info) {
        should.not.exist(err);
        info.should.deep.equal({});
        done();
      });
    });
    it('will call client getSpentInfo and give result', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getSpentInfo = sinon.stub().callsArgWith(1, null, {
        result: {
          txid: 'txid',
          index: 10,
          height: 101
        }
      });
      trivechaind.nodes.push({
        client: {
          getSpentInfo: getSpentInfo
        }
      });
      trivechaind.getSpentInfo({}, function(err, info) {
        if (err) {
          return done(err);
        }
        info.txid.should.equal('txid');
        info.index.should.equal(10);
        info.height.should.equal(101);
        done();
      });
    });
  });

  describe('#getInfo', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var getInfo = sinon.stub().callsArgWith(0, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          getInfo: getInfo
        }
      });
      trivechaind.getInfo(function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });
    it('will call client getInfo and give result', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.node.getNetworkName = sinon.stub().returns('testnet');
      var getInfo = sinon.stub().callsArgWith(0, null, {
        result: {
          version: 1,
          protocolversion: 1,
          blocks: 1,
          timeoffset: 1,
          connections: 1,
          proxy: '',
          difficulty: 1,
          testnet: true,
          relayfee: 10,
          errors: ''
        }
      });
      trivechaind.nodes.push({
        client: {
          getInfo: getInfo
        }
      });
      trivechaind.getInfo(function(err, info) {
        if (err) {
          return done(err);
        }
        should.exist(info);
        should.equal(info.version, 1);
        should.equal(info.protocolVersion, 1);
        should.equal(info.blocks, 1);
        should.equal(info.timeOffset, 1);
        should.equal(info.connections, 1);
        should.equal(info.proxy, '');
        should.equal(info.difficulty, 1);
        should.equal(info.testnet, true);
        should.equal(info.relayFee, 10);
        should.equal(info.errors, '');
        info.network.should.equal('testnet');
        done();
      });
    });
  });

  describe('#govObject', function() {
    it('will call client gobject list and give result', function(done) {
        var trivechaind = new TrivechainService(baseConfig);
        var gobject = sinon.stub().callsArgWith(1, null, {
            result: [{
                "Hash": "9ce5609d41b88fca51dd3f4ad098467cf8c6f2c1b2adf93a6862a7b9bdf01a00",
                "DataHex": "5b5b2270726f706f73616c222c7b22656e645f65706f6368223a313438343830393436302c226e616d65223a2264363534366361353232363730633664303039333662393562323766666233393631643063663234222c227061796d656e745f61646472657373223a22796a42746b73586b47483731693341346d6e374b7848793975634d6473717a756b57222c227061796d656e745f616d6f756e74223a332c2273746172745f65706f6368223a313438343636313730392c2274797065223a312c2275726c223a2268747470733a2f2f7777772e646173682e6f7267227d5d5d",
                "DataObject": {
                    "end_epoch": 1484809460,
                    "name": "d6546ca522670c6d00936b95b27ffb3961d0cf24",
                    "payment_address": "yjBtksXkGH71i3A4mn7KxHy9ucMdsqzukW",
                    "payment_amount": 3,
                    "start_epoch": 1484661709,
                    "type": 1,
                    "url": "https://www.trivechain.org"
                },
                "AbsoluteYesCount": 0,
                "YesCount": 0,
                "NoCount": 0,
                "AbstainCount": 0
            }, {
                "Hash": "21af004754d57660a5b83818b26263699b9e25c53a46395b7386e786d1644c00",
                "DataHex": "5b5b2270726f706f73616c222c7b22656e645f65706f6368223a313438343636353636372c226e616d65223a2236306164663935366535313138663331633131353564613866373662396134376464363863306361222c227061796d656e745f61646472657373223a227967684b6f5272526a31696f644c6f684e4e704b52504a5a7673537562367a626756222c227061796d656e745f616d6f756e74223a39382c2273746172745f65706f6368223a313438343635343931352c2274797065223a312c2275726c223a2268747470733a2f2f7777772e646173682e6f7267227d5d5d",
                "DataObject": {
                    "end_epoch": 1484665667,
                    "name": "60adf956e5118f31c1155da8f76b9a47dd68c0ca",
                    "payment_address": "yghKoRrRj1iodLohNNpKRPJZvsSub6zbgV",
                    "payment_amount": 98,
                    "start_epoch": 1484654915,
                    "type": 1,
                    "url": "https://www.trivechain.org"
                },
                "AbsoluteYesCount": 0,
                "YesCount": 0,
                "NoCount": 0,
                "AbstainCount": 0
            }, {
                "Hash": "4ef24027c631c43035aa4cf5c672e1298311decd9cffbd16731f454c9c0d6d00",
                "DataHex": "5b5b2270726f706f73616c222c7b22656e645f65706f6368223a313438333835353139332c226e616d65223a2237656139616366663561653833643863396532313764333061326234643130656638663137316638222c227061796d656e745f61646472657373223a22795a3744596b44484348664831647737724b6459614b6356796b5a6d756e62714e4c222c227061796d656e745f616d6f756e74223a38342c2273746172745f65706f6368223a313438333736353238322c2274797065223a312c2275726c223a2268747470733a2f2f7777772e646173682e6f7267227d5d5d",
                "DataObject": {
                    "end_epoch": 1483855193,
                    "name": "7ea9acff5ae83d8c9e217d30a2b4d10ef8f171f8",
                    "payment_address": "yZ7DYkDHCHfH1dw7rKdYaKcVykZmunbqNL",
                    "payment_amount": 84,
                    "start_epoch": 1483765282,
                    "type": 1,
                    "url": "https://www.trivechain.org"
                },
                "AbsoluteYesCount": 0,
                "YesCount": 0,
                "NoCount": 0,
                "AbstainCount": 0
            }]
        });
        trivechaind.nodes.push({
            client: {
                gobject: gobject
            }
        });
        trivechaind.govObjectList({type: 1}, function(err, result) {
            if (err) {
                return done(err);
            }
            should.exist(result);
            should.equal(result.length, 3);
            done();
        });
    });

    it('will call client gobject list and return error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var gobject = sinon.stub().callsArgWith(1, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          gobject: gobject
        }
      });
      trivechaind.govObjectList({type: 1}, function(err, result) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });

    it('will call client gobject get and give result', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var hash = "4ef24027c631c43035aa4cf5c672e1298311decd9cffbd16731f454c9c0d6d00";
      var gobject = sinon.stub().callsArgWith(2, null, {
        result: {
          "DataHex": "5b5b2270726f706f73616c222c7b22656e645f65706f6368223a313438333835353139332c226e616d65223a2237656139616366663561653833643863396532313764333061326234643130656638663137316638222c227061796d656e745f61646472657373223a22795a3744596b44484348664831647737724b6459614b6356796b5a6d756e62714e4c222c227061796d656e745f616d6f756e74223a38342c2273746172745f65706f6368223a313438333736353238322c2274797065223a312c2275726c223a2268747470733a2f2f7777772e646173682e6f7267227d5d5d",
          "DataString": "[[\"proposal\",{\"end_epoch\":1483855193,\"name\":\"7ea9acff5ae83d8c9e217d30a2b4d10ef8f171f8\",\"payment_address\":\"yZ7DYkDHCHfH1dw7rKdYaKcVykZmunbqNL\",\"payment_amount\":84,\"start_epoch\":1483765282,\"type\":1,\"url\":\"https://www.trivechain.org\"}]]",
          "Hash": "4ef24027c631c43035aa4cf5c672e1298311decd9cffbd16731f454c9c0d6d00",
          "CollateralHash": "6be3a3ae49498ec8f4e5cba56ac44164aeb78e57f2dbc716f4ff863034830d08",
          "CreationTime": 1483724928,
          "FundingResult": {
            "AbsoluteYesCount": 0,
            "YesCount": 0,
            "NoCount": 0,
            "AbstainCount": 0
          },
          "ValidResult": {
            "AbsoluteYesCount": -11,
            "YesCount": 36,
            "NoCount": 47,
            "AbstainCount": 0
          },
          "DeleteResult": {
            "AbsoluteYesCount": 0,
            "YesCount": 0,
            "NoCount": 0,
            "AbstainCount": 0
          },
          "EndorsedResult": {
            "AbsoluteYesCount": 0,
            "YesCount": 0,
            "NoCount": 0,
            "AbstainCount": 0
          },
          "fLocalValidity": true,
          "IsValidReason": "",
          "fCachedValid": false,
          "fCachedFunding": false,
          "fCachedDelete": false,
          "fCachedEndorsed": false
        }
      });
      trivechaind.nodes.push({
        client: {
          gobject: gobject
        }
      });
      trivechaind.govObjectHash('4ef24027c631c43035aa4cf5c672e1298311decd9cffbd16731f454c9c0d6d00', function(err, result) {
        if (err) {
          return done(err);
        }
        should.exist(result[0]);

        var DataObject = result[0].DataObject;
        should.equal(DataObject.end_epoch, 1483855193);
        should.equal(DataObject.name, '7ea9acff5ae83d8c9e217d30a2b4d10ef8f171f8');
        should.equal(DataObject.payment_address, 'yZ7DYkDHCHfH1dw7rKdYaKcVykZmunbqNL');
        should.equal(DataObject.payment_amount, 84);
        should.equal(DataObject.start_epoch, 1483765282);
        should.equal(DataObject.type, 1);
        should.equal(DataObject.url, 'https://www.trivechain.org');
        done();
      });
    });

    it('will call client gobject get and return error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var gobject = sinon.stub().callsArgWith(2, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          gobject: gobject
        }
      });
      trivechaind.govObjectHash('4ef24027c631c43035aa4cf5c672e1298311decd9cffbd16731f454c9c0d6d00', function(err, result) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });

  });
	describe('#sporksList', function(){
		it('will call client sporks and give result', function(done){
			var trivechaind = new TrivechainService(baseConfig);

			trivechaind.nodes.push({
				client: {
					spork: function(param, callback){
						if(param==="show"){
							callback(null,{result:{
								"SPORK_2_DIRECTSEND_ENABLED":0,
								"SPORK_3_DIRECTSEND_BLOCK_FILTERING":0,
								"SPORK_5_DIRECTSEND_MAX_VALUE":2000,
								"SPORK_8_MASTERNODE_PAYMENT_ENFORCEMENT":0,
								"SPORK_9_SUPERBLOCKS_ENABLED":0,
								"SPORK_10_MASTERNODE_PAY_UPDATED_NODES":0,
								"SPORK_12_RECONSIDER_BLOCKS":0,
								"SPORK_13_OLD_SUPERBLOCK_FLAG":4070908800,
								"SPORK_14_REQUIRE_SENTINEL_FLAG":4070908800
							}
							})
						}
					}
				}
			});
			trivechaind.getSpork(function(err, SporkList) {
				if (err) {
					return done(err);
				}
				SporkList.should.have.property('sporks');
				var sporks = SporkList.sporks;
				Object.keys(sporks).length.should.equal(9);
				sporks['SPORK_2_DIRECTSEND_ENABLED'].should.equal(0);
				sporks['SPORK_3_DIRECTSEND_BLOCK_FILTERING'].should.equal(0);
				sporks['SPORK_5_DIRECTSEND_MAX_VALUE'].should.equal(2000);
				sporks['SPORK_8_MASTERNODE_PAYMENT_ENFORCEMENT'].should.equal(0);
				sporks['SPORK_9_SUPERBLOCKS_ENABLED'].should.equal(0);
				sporks['SPORK_10_MASTERNODE_PAY_UPDATED_NODES'].should.equal(0);
				sporks['SPORK_12_RECONSIDER_BLOCKS'].should.equal(0);
				sporks['SPORK_13_OLD_SUPERBLOCK_FLAG'].should.equal(4070908800);
				sporks['SPORK_14_REQUIRE_SENTINEL_FLAG'].should.equal(4070908800);
				done();
			});
		});
	});
  describe('#getMNList', function(){
    it('will call client masternode list and give result', function(done){
	    var trivechaind = new TrivechainService(baseConfig);
	    trivechaind.isSynced = function(callback) { return callback(null, true) };
	    trivechaind.nodes.push({
		    client: {
			    masternodelist: function(type, cb){
			      switch (type){
                      case "rank":
	                      return cb(null, { result:
		                      { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 1,
			                      'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 2}
	                      });
				      case "protocol":
					      return cb(null, { result:
						      { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 70206,
							      'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 70206}
					      });
                      case "payee":
	                      return cb(null, { result:
		                      { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "Xfpp5BxPfFistPPjTe6FucYmtDVmT1GDG3",
			                      'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "Xn16rfdygfViHe2u36jkDUs9NLmUrUsEKa"}
	                      });
				      case "lastseen":
					      return cb(null, { result:
						      { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 1502078120,
							      'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 1502078203}
					      });
				      case "activeseconds":
					      return cb(null, { result:
						      { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 7016289,
							      'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 2871829}
					      });
				        break;
				      case "addr":
					      return cb(null, { result:
						      { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "108.61.209.47:9999",
							      'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "34.226.228.73:9999"}
					      });
				      case "status":
					      return cb(null, { result:
						      { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "ENABLED",
							      'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "ENABLED"}
					      });
                  }
                }
		    }
	    });

	    trivechaind.getMNList(function(err, MNList) {
		    if (err) {
			    return done(err);
		    }
		    MNList.length.should.equal(2);
		    MNList[0].vin.should.equal("06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0");
		    MNList[0].status.should.equal("ENABLED");
		    MNList[0].rank.should.equal(1);
		    MNList[0].ip.should.equal("108.61.209.47:9999");
		    MNList[0].protocol.should.equal(70206);
		    MNList[0].payee.should.equal("Xfpp5BxPfFistPPjTe6FucYmtDVmT1GDG3");
		    MNList[0].activeseconds.should.equal(7016289);
		    MNList[0].lastseen.should.equal(1502078120);
		    done();
	    });
    });

    it('will return error if one of nodes not synced yet', function(done){
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.isSynced = function(callback) { return callback(null, false) };
      trivechaind.nodes.push({
        client: {
          masternodelist: function(type, cb){
            switch (type){
              case "rank":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 1,
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 2}
                });
              case "protocol":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 70206,
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 60000}
                });
              case "payee":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "Xfpp5BxPfFistPPjTe6FucYmtDVmT1GDG3",
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "Xn16rfdygfViHe2u36jkDUs9NLmUrUsEKa"}
                });
              case "lastseen":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 1502078120,
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 1502078203}
                });
              case "activeseconds":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 7016289,
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 2871829}
                });
                break;
              case "addr":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "108.61.209.47:9999",
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "34.226.228.73:9999"}
                });
              case "status":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "ENABLED",
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "ENABLED"}
                });
            }
          }
        }
      });

      trivechaind.getMNList(function(err, MNList) {
        err.should.be.instanceof(Error);
        console.log(err);
        done();
      });
    });

    it('will return error if checking synced state of nodes failed', function(done){
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.isSynced = function(callback) { return callback(new Error('Failed')) };
      trivechaind.nodes.push({
        client: {
          masternodelist: function(type, cb){
            switch (type){
              case "rank":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 1,
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 2}
                });
              case "protocol":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 70206,
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 60000}
                });
              case "payee":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "Xfpp5BxPfFistPPjTe6FucYmtDVmT1GDG3",
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "Xn16rfdygfViHe2u36jkDUs9NLmUrUsEKa"}
                });
              case "lastseen":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 1502078120,
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 1502078203}
                });
              case "activeseconds":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': 7016289,
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': 2871829}
                });
                break;
              case "addr":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "108.61.209.47:9999",
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "34.226.228.73:9999"}
                });
              case "status":
                return cb(null, { result:
                  { '06c4c53b64019a021e8597c19e40807038cab4cd422ca9241db82aa19887354b-0': "ENABLED",
                    'b76bafae974b80204e79858eb62aedec41159519c90d23f811cca1eca40f2e4c-1': "ENABLED"}
                });
            }
          }
        }
      });

      trivechaind.getMNList(function(err, MNList) {
        err.should.be.instanceof(Error);
        done();
      });
    });
  });

  describe('#generateBlock', function() {
    it('will give rpc error', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var generate = sinon.stub().callsArgWith(1, {message: 'error', code: -1});
      trivechaind.nodes.push({
        client: {
          generate: generate
        }
      });
      trivechaind.generateBlock(10, function(err) {
        should.exist(err);
        err.should.be.an.instanceof(errors.RPCError);
        done();
      });
    });
    it('will call client generate and give result', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      var generate = sinon.stub().callsArgWith(1, null, {
        result: ['hash']
      });
      trivechaind.nodes.push({
        client: {
          generate: generate
        }
      });
      trivechaind.generateBlock(10, function(err, hashes) {
        if (err) {
          return done(err);
        }
        hashes.length.should.equal(1);
        hashes[0].should.equal('hash');
        done();
      });
    });
  });

  describe('#stop', function() {
    it('will callback if spawn is not set', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.stop(done);
    });
    it('will exit spawned process', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.spawn = {};
      trivechaind.spawn.process = new EventEmitter();
      trivechaind.spawn.process.kill = sinon.stub();
      trivechaind.stop(done);
      trivechaind.spawn.process.kill.callCount.should.equal(1);
      trivechaind.spawn.process.kill.args[0][0].should.equal('SIGINT');
      trivechaind.spawn.process.emit('exit', 0);
    });
    it('will give error with non-zero exit status code', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.spawn = {};
      trivechaind.spawn.process = new EventEmitter();
      trivechaind.spawn.process.kill = sinon.stub();
      trivechaind.stop(function(err) {
        err.should.be.instanceof(Error);
        err.code.should.equal(1);
        done();
      });
      trivechaind.spawn.process.kill.callCount.should.equal(1);
      trivechaind.spawn.process.kill.args[0][0].should.equal('SIGINT');
      trivechaind.spawn.process.emit('exit', 1);
    });
    it('will stop after timeout', function(done) {
      var trivechaind = new TrivechainService(baseConfig);
      trivechaind.shutdownTimeout = 300;
      trivechaind.spawn = {};
      trivechaind.spawn.process = new EventEmitter();
      trivechaind.spawn.process.kill = sinon.stub();
      trivechaind.stop(function(err) {
        err.should.be.instanceof(Error);
        done();
      });
      trivechaind.spawn.process.kill.callCount.should.equal(1);
      trivechaind.spawn.process.kill.args[0][0].should.equal('SIGINT');
    });
  });

});
