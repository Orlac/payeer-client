var request = require('https').request;
var errors = require('./errors');
var utils = require('./utils');

var DEFAULT_OPTS = JSON.stringify({
  hostname: 'payeer.com',
  path: '/ajax/api/api.php',
  method: 'POST',
  headers: {'Content-Type': 'application/x-www-form-urlencoded'}
});

var BadInputError = errors.BadInputError;
var PayeerUnauthorizedEror = errors.PayeerUnauthorizedEror;
var PayeerRequestError = errors.PayeerRequestError;

var Payeer = function Payeer(args) {
  'use strict';
  return this._init.call(this, args);
};

module.exports = Payeer;

Payeer.prototype._auth = null;
Payeer.prototype._account = null;
Payeer.prototype._apiId = null;
Payeer.prototype._apiPass = null;
Payeer.prototype._lang = null;
Payeer.prototype._ip = null;

Payeer.prototype.authenticate = function(callback) {
  'use strict';
  if (this.isAuth()) return callback(null, {authenticated: true});
  this._authenticate(callback);
};

Payeer.prototype.isAuth = function() {
  'use strict';
  return Object.keys(this._auth).length > 0;
};

Payeer.prototype.setLang = function(lang) {
  'use strict';
  this._lang = lang;
};

Payeer.prototype.setIp = function(ip) {
  'use strict';
  this._ip = ip;
};

Payeer.prototype.getPaySystems = function(callback) {
  'use strict';
  var data = {action: 'getPaySystems'};
  this._sendRequest([], data, callback);
};

Payeer.prototype.getOperationDetail = function(id, callback) {
  'use strict';
  var required = ['historyId'];
  var data = {
    action: 'historyInfo',
    historyId: id
  };
  this._sendRequest(required, data, callback);
};

Payeer.prototype.getOrderDetail = function(data, callback) {
  'use strict';
  var required = ['shopId', 'orderId'];
  data.action = 'shopOrderInfo';
  this._sendRequest(required, data, callback);
};

Payeer.prototype.userExist = function(userId, callback) {
  'use strict';
  var required = ['user'];
  var data = {
    action: 'checkUser',
    user: userId
  };

  this._sendRequest(required, data, function(error) {
    if (error) return callback(error);
    callback(null, {exists: true});
  });
};

Payeer.prototype.getBalance = function(callback) {
  'use strict';
  var data = {action: 'balance'};
  this._sendRequest([], data, callback);
};

Payeer.prototype.getExchangeRate = function(output, callback) {
  'use strict';
  var data = {
    output: 'N',
    action: 'getExchangeRate'
  };
  if (typeof output !== 'boolean') {
    return callback(new BadInputError('output must be a boolean'));
  }
  if (output) {
    data.output = 'Y';
  }
  this._sendRequest(['output'], data, callback);
};

Payeer.prototype.merchant = function(data, callback) {
  var required = ['ip', 'shop', 'ps', 'form'];
  data.action = 'merchant';

  if (!data.ip) {
    data.ip = this._ip;
  }

  this._sendRequest(required, data, callback);
};

Payeer.prototype.transfer = function(data, callback) {
  'use strict';
  var required = ['curIn', 'sum', 'curOut', 'to'];
  data.action = 'transfer';
  this._sendRequest(required, data, callback);
};

Payeer.prototype.payoutVisaMasterCardBank = function(data, callback) {
  'use strict';
  var client = this;
  var required = ['sumIn', 'curIn', 'curOut',
    'ps', 'param_ACCOUNT_NUMBER', 'param_EXP_DATE'];

  try {
    this._validateInputObject(required, data);
  } catch (error) {
    return callback(error);
  }

  if (typeof data.sumIn !== 'number') {
    return callback(new BadInputError('sumOut must be a number'));
  }

  client._initOutput(data, function(error, output) {
    if (error) return callback(error);
    Object.keys(output).forEach(function(key) {
      data[key] = output[key];
    });
    client._output(data, callback);
  });
};

Payeer.prototype._init = function(args) {
  'use strict';
  if (!args) {
    throw new BadInputError('arguments object is required');
  }

  if (!args.account || !args.apiId || !args.apiPass) {
    throw new BadInputError('account, apiId and apiPass are required');
  }

  this._auth = {};
  this._lang = 'en';
  this._account = args.account;
  this._apiId = args.apiId;
  this._apiPass = args.apiPass;
  return this;
};

Payeer.prototype._authenticate = function(callback) {
  'use strict';
  var client = this;
  var data = {
    account: this._account,
    apiId: this._apiId,
    apiPass: this._apiPass
  };

  this._sendRequest([], data, function(error, body) {
    if (error || body.authError === '1') {
      return callback(new PayeerUnauthorizedEror('authentication failed'));
    }

    client._auth = data;
    callback(null, {authenticated: true});
  });
};

Payeer.prototype._initOutput = function(data, callback) {
  'use strict';
  var required = [];
  data.action = 'initOutput';
  this._sendRequest(required, data, callback);
};

Payeer.prototype._output = function(output, callback) {
  output.action = 'output';
  this._sendRequest([], output, callback);
};

Payeer.prototype._validateInputObject = function(required, input) {
  'use strict';
  var invalid = required.some(function(field) {
    return typeof input[field] === 'undefined' || input[field] === null;
  });
  if (invalid) throw new BadInputError(required.join(', ') + ' are required');
  return true;
};

Payeer.prototype._createDataString = function(data) {
  'use strict';
  var fields = Object.keys(data);
  var encoded = [];

  fields.forEach(function(key) {
    encoded.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
  });

  return encoded.join('&');
};

Payeer.prototype._parseResponse = function(response, callback) {
  'use strict';
  var omit = ['errors', 'auth_error'];
  var ret = {};
  var error;
  var errors;

  if (!response) {
    response = '{}';
  }

  try {
    response = utils.camelizeResponse(JSON.parse(response));
  } catch (err) {
    return callback(new BadInputError('response must be a json string'));
  }

  if (response.errors instanceof Array && !response.errors.length) {
    delete response.errors;
  }
  if (response.errors) {
    errors = JSON.parse(JSON.stringify(response.errors));
    error = new PayeerRequestError('errors present in response', errors);
    return callback(error);
  }

  if (response.authError && response.authError !== '0') {
    error = new PayeerUnauthorizedEror('unauthenticated request');
    return callback(error);
  }

  ret = utils.omitKeys(omit, response);

  callback(null, ret);
};

Payeer.prototype._authenticateRequest = function(data) {
  'use strict';
  var auth;
  if (!this._auth) return data;

  auth = this._auth;
  Object.keys(auth).forEach(function(key) {
    data[key] = auth[key];
  });
  return data;
};

Payeer.prototype._sendRequest = function(requiredFields, data, callback) {
  'use strict';
  var client = this;
  var dataString;
  var requestOptions;
  var requestObject;

  try {
    client._validateInputObject(requiredFields, data);
  } catch (error) {
    return callback(error);
  }

  if (client.isAuth()) {
    data = client._authenticateRequest(data);
  }

  data.language = this._lang;
  client = this;
  dataString = this._createDataString(data);
  requestOptions = JSON.parse(DEFAULT_OPTS);
  requestOptions.headers['Content-Length'] = dataString.length;

  requestObject = request(requestOptions, function(response) {
    var responseJSON = '';
    response.setEncoding('utf8');
    response.on('data', function(chunk) {
      responseJSON += chunk;
    });
    response.on('end', function() {
      client._parseResponse(responseJSON, callback);
    });
  });
  requestObject.write(dataString);
  requestObject.end();
};
