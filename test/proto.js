var Payeer = require('../lib/client');
var payeer = new Payeer({
  account: 'P23112709',
  apiId: '91417775',
  apiPass: '6fpncsog0vO6pJCU'
});

var data = {
  sumIn: 40,
  curIn: 'USD',
  curOut: 'USD',
  ps: '14334491',
  param_ACCOUNT_NUMBER: '5579090019152835',
  param_EXP_DATE: '03/19'
};

payeer.authenticate(function() {
  payeer.payoutVisaMasterCardBank(data, function(error, response){
    console.log('TEST result', error, response);
  });
});


// payeer.payout()


// {
//   outputParams: {
//     sumIn: '37.75',
//      curIn: 'USD',
//      curOut: 'USD',
//      ps: 14334491,
//      sumOut: '30.00'
//   },
//   action : 'output'
// }
//
// {
//   sumIn: '37.75',
//    curIn: 'USD',
//    curOut: 'USD',
//    ps: 14334491,
//    sumOut: '30.00',
//    action : 'output'
// }
