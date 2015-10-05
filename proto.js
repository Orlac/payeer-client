var Payeer = require('./lib/client');

var client = new Payeer({account:'P23112709', apiId:'91417775', apiPass:'6fpncsog0vO6pJCU'});

client.authenticate(function(error, auth) {
  console.log('Authenticate: ', error, auth);
  // client.getBalance(function(error, balance) {
  //   console.log('Get Balance: ', error, balance);
  // });
  //
  client.getPaySystems(function(error, paySystems) {
    Object.keys(paySystems.list).forEach(function(id) {
      console.log(paySystems.list[id]);
    });
  });

  // var data = {
  //   curIn: 'USD',
  //   sum: '30',
  //   curOut: 'USD',
  //   'to': '5579100121868421'
  // };
  //
  // client.transfer(data, function(error, operation) {
  //   console.log('Transfer', error, error ? error.stack : null, operation);
  // });

  client.userExist('P23112709', function(error, response) {
    console.log('User exists');
    console.log(error, response);
  });
  // client.userExist('P1000000', function(error, response) {
  //   console.log('User exists');
  //   console.log(error, response);
  // });
  client.userExist('P23453288', function(error, response) {
    console.log('User exists');
    console.log(error, response);
  });

  // 91629514
  // client.getOperationDetail(91629514, function(error, response) {
  //   console.log('Operation detail');
  //   console.log(error, response);
  // });
});
