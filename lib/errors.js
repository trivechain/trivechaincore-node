'use strict';

var createError = require('errno').create;

var TrivechaincoreNodeError = createError('TrivechaincoreNodeError');

var RPCError = createError('RPCError', TrivechaincoreNodeError);

module.exports = {
  Error: TrivechaincoreNodeError,
  RPCError: RPCError
};
