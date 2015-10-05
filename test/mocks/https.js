var EventEmitter = require('events').EventEmitter;
var httpMocks = require('node-mocks-http');

module.exports = function(result) {
  return {
    request: function(options, callback) {
      var request = httpMocks.createRequest(options);
      var response = httpMocks.createResponse({
        eventEmitter: EventEmitter
      });

      request.write = function(data) {
      };

      request.end = function() {
        if (typeof result !== 'string') {
          result = JSON.stringify(result);
        }
        response.emit('data', result);
        response.end();
      };

      callback(response);

      return request;
    }
  };
}
