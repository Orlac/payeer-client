var chai = require('chai');
var proxyquire = require('proxyquire');
var mockRequest = require('node-mocks-http');
var Payeer = require('./../lib/client');
var errors = require('./../lib/errors');
var expect = chai.expect;
var BAD_INPUT = 'BAD_INPUT';
var PAYEER_UNAUTHORIZED = 'PAYEER_UNAUTHORIZED';
var PAYEER_REQUEST_FAILED = 'PAYEER_REQUEST_FAILED';

var expectCustomError = function(error, response, errorName, callback) {
  expect(error).to.exist;
  expect(response).not.to.exist;
  expect(error).to.have.property('name', errorName);
  if (callback) return callback();
};

var expectCustomResponse = function(error, response, expected, callback) {
  expect(error).not.to.exist;
  expect(response).to.exist;
  Object.keys(expected).forEach(function(key) {
    expect(response).to.have.property(key, expected[key]);
  });
  if (callback) return callback();
};

describe('Payeer Client', function() {
  describe('#_init', function() {
    var Payeer;

    beforeEach(function() {
      Payeer = require('./../lib/client');
    });

    it('should throw error if bad input is sent', function() {
      function failWithInput(input) {
        var expectedError;
        try {
          var payeer = new Payeer(input);
        } catch (error) {
          expectedError = error;
        }
        expect(expectedError).to.exist;
        expect(expectedError).to.have.property('name', 'BAD_INPUT');
      }

      var input;
      failWithInput(input);

      input = {
        apiId: '1',
        apiPass: '1'
      };
      failWithInput(input);

      input = {
        account: '1',
        apiPass: '1'
      };
      failWithInput(input);

      input = {
        apiPass: '1',
        apiId: '1'
      };
      failWithInput(input);
    });

    it('should return instance of Payeer if good input is sent', function() {
      var payeer;
      var unexpectedError;
      try {
        payeer = new Payeer({
          apiPass: '1',
          apiId: '1',
          account: '1'
        });
      } catch (error) {
        unexpectedError = error;
      }

      expect(unexpectedError).not.to.exist;
      expect(payeer).to.exist;
      expect(payeer).to.be.instanceOf(Payeer);
    });
  });

  describe('#_validateInputObject', function() {
    var payeer;
    var data;
    beforeEach(function () {
      var Payeer = require('./../lib/client');
      payeer = new Payeer({
        apiPass: '1',
        apiId: '1',
        account: '1'
      });

      data = {a: 1, c: 2};
    });

    it('should throw error if a required field is missing in data', function() {
      var required = ['a', 'b'];
      var expectedError;

      expect(function() {
        payeer._validateInputObject(required, data);
      }).to.throw(Error);

      try {
        payeer._validateInputObject(required, data);
      } catch (error) {
        expectedError = error;
      }

      expect(expectedError).to.exist;
      expect(expectedError).to.have.property('name', 'BAD_INPUT');
    });

    it('should return true if no data is missing', function() {
      var required = ['a', 'c'];
      var unexpectedError;
      var valid;

      expect(function() {
        valid = payeer._validateInputObject(required, data);
      }).not.to.throw(Error);

      try {
        payeer._validateInputObject(required, data);
      } catch (error) {
        unexpectedError = error;
      }

      expect(unexpectedError).not.to.exist;
      expect(valid).to.be.equal(valid);
    });

    it('should return true if there are no required fields', function() {
      var required = [];
      var unexpectedError;
      var valid;
      expect(function() {
        valid = payeer._validateInputObject(required, data);
      }).not.to.throw(Error);

      try {
        payeer._validateInputObject(required, data);
      } catch (error) {
        unexpectedError = error;
      }

      expect(unexpectedError).not.to.exist;
      expect(valid).to.be.equal(valid);
    });
  });

  describe('#_createDataString', function() {
    var payeer;

    beforeEach(function () {
      var Payeer = require('./../lib/client');
      payeer = new Payeer({
        apiPass: '1',
        apiId: '1',
        account: '1'
      });
    });

    it('should return all arguments in string format', function() {
      payeer.setLang('es');
      var data = {a: 1, b: 2, language: payeer._lang};
      expect(payeer._createDataString(data)).to.be.equal('a=1&b=2&language=es');
    });

    it('should return empty string if no arguments are present', function() {
      var data = {};
      expect(payeer._createDataString(data)).to.be.equal('');
    });
  });

  describe('#_parseResponse', function() {
    beforeEach(function () {
      var Payeer = require('./../lib/client');
      payeer = new Payeer({
        apiPass: '1',
        apiId: '1',
        account: '1'
      });
    });

    it('should return error if not a valid JSON string', function(done) {
      var data = 'invalid json';
      payeer._parseResponse(data, function(error, response) {
        expectCustomError(error, response, BAD_INPUT);
      });
      var data = '{invalid: "json"}';
      payeer._parseResponse(data, function(error, response) {
        expectCustomError(error, response, BAD_INPUT);
      });
      data = {};
      payeer._parseResponse(data, function(error, response) {
        expectCustomError(error, response, BAD_INPUT);
      });
      data = [];
      payeer._parseResponse(data, function(error, response) {
        expectCustomError(error, response, BAD_INPUT, done);
      });
    });

    it('should return error if auth_error is found', function(done) {
      var data = '{"authError": "1"}';
      payeer._parseResponse(data, function(error, response) {
        expectCustomError(error, response, PAYEER_UNAUTHORIZED, done);
      });
    });

    it('should return error if response.errors is present and contains elements', function() {
      var data = '{"errors": ["error 1", "error 2"]}';
      payeer._parseResponse(data, function(error, response) {
        expectCustomError(error, response, PAYEER_REQUEST_FAILED);
        expect(error).to.have.property('errors');
        expect(error.errors).to.have.length(2);
      });
    });

    it('should return response without .errors and .auth_error', function() {
      var data = '{"auth_error": "0", "errors": [], "a": 1}';
      payeer._parseResponse(data, function(error, response) {
        expect(error).not.to.exist;
        expect(response).to.exist;
        expect(response).not.to.have.property('auth_error');
        expect(response).not.to.have.property('errors');
        expect(response).to.have.property('a', 1);
      });
    });

    it('should return empty response object if data is falsy', function() {
      var data = '';
      payeer._parseResponse(data, function(error, response) {
        expect(error).not.to.exist;
        expect(response).to.exist;
        expect(Object.keys(response)).to.have.length(0);
      });
    });
  });

  describe('#_authenticateRequest', function() {
    beforeEach(function () {
      var Payeer = require('./../lib/client');
      payeer = new Payeer({
        apiPass: '1',
        apiId: '1',
        account: '1'
      });
    });

    it('should add authention params to data if present', function() {
      var data = {a: 1};
      payeer._auth = {
        apiPass: '1',
        apiId: '1',
        account: '1'
      };
      data = payeer._authenticateRequest(data);
      expect(data).to.have.property('apiPass', '1');
      expect(data).to.have.property('apiId', '1');
      expect(data).to.have.property('account', '1');
      expect(data).to.have.property('a', 1);
      expect(Object.keys(data)).to.have.length(4);
    });

    it('should leave data as is if auth data not present', function() {
      var data = {a: 1};
      payeer._auth = null;
      data = payeer._authenticateRequest(data);
      expect(data).to.have.property('a', 1);
      expect(Object.keys(data)).to.have.length(1);
    });
  });

  describe('#_sendRequest', function() {
    var payeer;

    it('should return a response with expected data', function(done) {
      var httpsMock = require('./mocks/https')('{"auth_error": "0", "status": "success"}');
      var Payeer = proxyquire('./../lib/client', {'https': httpsMock});
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {
        a: 1,
        b: 2
      };
      payeer._sendRequest([], data, function(error, response) {
        expectCustomResponse(error, response, {status: 'success'}, done);
      });
    });

    it('should return an PAYEER_UNAUTHORIZED with auth_error', function(done) {
      var httpsMock = require('./mocks/https')('{"auth_error": "1"}');
      var Payeer = proxyquire('./../lib/client', {'https': httpsMock});
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {a: 1};
      payeer._sendRequest([], data, function(error, response) {
        expect(error).to.exist;
        expect(response).not.to.exist;
        expect(error).to.have.property('name', 'PAYEER_UNAUTHORIZED');
        done();
      });
    });

    it('should return an PAYEER_REQUEST_FAILED with errors', function(done) {
      var httpsMock = require('./mocks/https')('{"errors": ["this is an error"]}');
      var Payeer = proxyquire('./../lib/client', {
        'https': httpsMock
      });
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {a: 1};
      payeer._sendRequest([], data, function(error, response) {
        expect(error).to.exist;
        expect(response).not.to.exist;
        expect(error).to.have.property('name', 'PAYEER_REQUEST_FAILED');
        expect(error.errors).to.have.length(1);
        done();
      });
    });

    it('should return an BAD_INPUT if missing required data', function(done) {
      var httpsMock = require('./mocks/https')('{}');
      var Payeer = proxyquire('./../lib/client', {
        'https': httpsMock
      });
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {a: 1};
      payeer._sendRequest(['b'], data, function(error, response) {
        expect(error).to.exist;
        expect(response).not.to.exist;
        expect(error).to.have.property('name', 'BAD_INPUT');
        done();
      });
    });

  });

  describe('#_authenticate', function() {

    it('should add auth data to client', function(done) {
      var data = {a: 1};
      var httpsMock = require('./mocks/https')('{"auth_error": "0"}');
      var Payeer = proxyquire('./../lib/client', {
        'https': httpsMock
      });
      var auth = {
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      };
      var payeer = new Payeer(auth);

      payeer._authenticate(function(error, response) {
        expectCustomResponse(error, response, {authenticated: true});
        expect(payeer).to.have.deep.property('_auth.apiPass', 'testPass');
        expect(payeer).to.have.deep.property('_auth.apiId', 'testUser');
        expect(payeer).to.have.deep.property('_auth.account', 'testAccount');
        done();
      });
    });

    it('should return PAYEER_UNAUTHORIZED if auth error is present', function(done) {
      var data = {a: 1};
      var httpsMock = require('./mocks/https')('{"auth_error": "1"}');
      var Payeer = proxyquire('./../lib/client', {
        'https': httpsMock
      });
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });

      payeer._authenticate(function(error, response) {
        expectCustomError(error, response, PAYEER_UNAUTHORIZED, done)
      });
    });

  });

  describe('#authenticate', function() {
    it('should send authenticate request if no _auth is present', function(done) {
      var httpsMock = require('./mocks/https')('{"auth_error": "0"}');
      var Payeer = proxyquire('./../lib/client', {'https': httpsMock});
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      payeer.authenticate(function(error, response) {
        expectCustomResponse(error, response, {authenticated: true}, done);
      });
    });

    it('should skip authenticate request if _auth is present', function(done) {
      var Payeer = require('./../lib/client');
      var auth = {
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      };
      var payeer = new Payeer(auth);
      payeer._auth = auth;
      payeer.authenticate(function(error, response) {
        expectCustomResponse(error, response, {authenticated: true}, done);
      });
    });
  });

  describe('#payout', function() {

    it('should return error if arguments are missing', function(done) {
      var Payeer = require('./../lib/client');
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {
        'curOut': 'USD',
        'curIn': 'USD',
        'sumOut': 30,
        'param_ACCOUNT_NUMBER': '5555555555554444'
      };
      payeer.payout(data, function(error, response) {
        expectCustomError(error, response, BAD_INPUT ,done);
      });
    });

    it('should return historyId when charge goes through', function(done) {
      var httpsMock = require('./mocks/https')('{"auth_error": "0", "historyId": 9918928}');
      var Payeer = proxyquire('./../lib/client', {'https': httpsMock});
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {
        'curOut': 'USD',
        'curIn': 'USD',
        'sumOut': 30,
        'ps': 123123,
        'param_ACCOUNT_NUMBER': '5555555555554444'
      };
      payeer.payout(data, function(error, response) {
        expectCustomResponse(error, response, {historyId: 9918928}, done);
      });
    });

    it('it should return error when sumOut is not a number', function(done) {
      var Payeer = require('./../lib/client');
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {
        'curOut': 'USD',
        'curIn': 'USD',
        'sumOut': 'treintayocho',
        'ps': 123123,
        'param_ACCOUNT_NUMBER': '5555555555554444'
      };
      payeer.payout(data, function(error, response) {
        expect(error).to.exist;
        expect(response).not.to.exist;
        expect(error).to.have.property('name', 'BAD_INPUT');
        done();
      });
    });

  });

  describe('#merchant', function() {
    it('should append id to data if present', function(done) {
      var Payeer = require('./../lib/client');
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {
        shop: 919191919,
        ps: 123123,
        form: {}
      };
      var ip = '0.0.0.0';
      payeer._sendRequest = function(required, data, callback) {
        return callback(null, data);
      };
      payeer.setIp(ip);
      expect(payeer).to.have.property('_ip', ip);
      payeer.merchant(data, function(error, response) {
        expect(error).not.to.exist;
        expect(response).to.exist;
        expect(response).to.have.property('ip', payeer._ip);
        done();
      });
    });
  });

  describe('#getOperationDetail if data is complete', function() {
    it('should return response', function(done) {
      var httpsMock = require('./mocks/https')('{"auth_error": "0", "customData": true}');
      var Payeer = proxyquire('./../lib/client', {'https': httpsMock});
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var id = 919191919;
      payeer.getOperationDetail(id, function(error, response) {
        expect(error).not.to.exist;
        expect(response).to.exist;
        expect(response).to.have.property('customData', true);
        done();
      });
    });

    it('should return error if data is missing', function(done) {
      var Payeer = require('./../lib/client');
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      payeer.getOperationDetail(null, function(error, response) {
        expect(error).to.exist;
        expect(response).not.to.exist;
        expect(error).to.have.property('name', 'BAD_INPUT');
        done();
      });
    });
  });

  describe('#getOrderDetail', function() {
    it('should return error if data is missing', function(done) {
      var Payeer = require('./../lib/client');
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = { shopId: 99999 };
      payeer.getOrderDetail(data, function(error, response) {
        expectCustomError(error, response, BAD_INPUT, done);
      });
    });
    it('should return response if data is complete', function(done) {
      var httpsMock = require('./mocks/https')('{"auth_error": "0", "customData": true}');
      var Payeer = proxyquire('./../lib/client', {'https': httpsMock});
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      var data = {
        shopId: 99999,
        orderId: 99999
      };
      payeer.getOrderDetail(data, function(error, response) {
        expectCustomResponse(error, response, {customData: true}, done);
      });
    });
  });

  describe('#getExchangeRate', function() {
    it('should make sure first argument is boolean', function(done) {
      var httpsMock = require('./mocks/https')('{"auth_error": "0", "customData": true}');
      var Payeer = proxyquire('./../lib/client', {'https': httpsMock});
      var payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      payeer.getExchangeRate(null, function(error, response) {
        expectCustomError(error, response, BAD_INPUT);
        payeer.getExchangeRate(1, function(error, response) {
          expectCustomError(error, response, BAD_INPUT);
          payeer.getExchangeRate(false, function(error, response) {
            expectCustomResponse(error, response, {customData: true}, done);
          });
        });
      });
    });
  });

  describe('#userExist', function() {
    var payeer;
    beforeEach(function(done) {
      var httpsMock = require('./mocks/https')('{"auth_error": "0", "errors": []}');
      var Payeer = proxyquire('./../lib/client', {'https': httpsMock});
      payeer = new Payeer({
        apiPass: 'testPass',
        apiId: 'testUser',
        account: 'testAccount'
      });
      done();
    });

    it('should return error if userId is not present', function(done) {
      payeer.userExist(null, function(error, response) {
        expectCustomError(error, response, BAD_INPUT, done);
      });
    });

    it('should return true if request goes through and suer exists', function(done) {
      payeer.userExist(1, function(error, response) {
        expectCustomResponse(error, response, {exists: true}, done);
      });
    });
  });
});
