var camelizeString;
var camelizeProperties;
var omitKeys;

module.exports = exports = {};

camelizeString = function(str) {
  var regex = /(?:[-_])(\w)/g;
  var ret = str.replace(regex, function(c) {
    return c ? c.toUpperCase().replace(/[-_]/, '') : '';
  });

  return ret;
};
exports.camelizeString = camelizeString;

camelizeProperties = function(obj) {
  var keys = Object.keys(obj);
  var ret = {};

  keys.forEach(function(key) {
    ret[camelizeString(key)] = obj[key];
  });
  return ret;
};
exports.camelizeProperties = camelizeProperties;
exports.camelizeResponse = camelizeProperties;

omitKeys = function(omit, obj) {
  var ret = {};
  Object.keys(obj).forEach(function(key) {
    if (omit.indexOf(key) < 0) {
      ret[key] = obj[key];
    }
  });
  return ret;
};

exports.omitKeys = omitKeys;
