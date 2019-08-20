'use strict';

var should = require('chai').should();

describe('Index Exports', function() {
  it('will export trivechaincore-lib', function() {
    var trivechaincore = require('../');
    should.exist(trivechaincore.lib);
    should.exist(trivechaincore.lib.Transaction);
    should.exist(trivechaincore.lib.Block);
  });
});
