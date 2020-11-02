// e.g. for high RPS test
import request from 'request-promise-native';

const defaultReqOpts = {
  method: 'GET',
  headers: {
    'Accept': 'application/json;charset=UTF-8',
  }
};

function makeRequest(params) {
  delete params.reqNums;

  return request(params).then(() => null, err => {
    let aborted = {details: {}};

    if (err.statusCode) {
      aborted[err.statusCode + ' HTTP STATUS'] = 1;
      aborted.details['[' + params.method.toUpperCase() + '] ' + params.url] = {
        [err.statusCode + ' HTTP STATUS']: 1
      }
    } else if (err.name) {
      aborted[err.name] = 1;
      aborted.details['[' + params.method.toUpperCase() + '] ' + params.url] = {
        [err.name]: 1
      }
    } else {
      aborted['UNDEFINED Errors'] = 1;
      aborted.details['[' + params.method.toUpperCase() + '] ' + params.url] = {
        ['UNDEFINED Errors']: 1
      }
    }

    return aborted;
  });
}

flowRequestGenerator().then(data => {
  let aborted = {details: {}};

  for (let i = 0, l = data.length; i < l; i++) {
    if (!data[i]) continue;

    for (let k in data[i]) {
      if (k !== 'details') {
        if (!(k in aborted)) aborted[k] = 0;
        aborted[k] += data[i][k];
      } else {
        for (let uri in data[i][k]) {
          if (!(aborted.details[uri])) aborted.details[uri] = {};
          let errTypes = data[i][k][uri];

          for (let errType in errTypes) {
            if (!(aborted.details[uri][errType])) aborted.details[uri][errType] = 0;
            aborted.details[uri][errType] += errTypes[errType];
          }
        }
      }
    }
  }

  let total  = 0;

  for (let k in aborted) {
    if (k === 'details') continue;
    total += aborted[k];
  }

  console.log('==========================================');
  console.log('              ERRORS');
  console.log('TOTAL:', total);
  for (let k in aborted) {
    if (k === 'details') continue;
    console.log(k +':', aborted[k]);
  }
  if (Object.keys(aborted.details).length) {
    console.log('\n              DETAILS');
    for (let uri in aborted.details) {
      console.log(uri);
      for (let errType in aborted.details[uri]) {
        console.log('    ', errType + ':', aborted.details[uri][errType]);
      }
      console.log('\n');
    }
  }

  console.log('==========================================');

  return aborted;
});

async function flowRequestGenerator(opts = [{url: 'http://localhost:3000/some-page', reqNums: 50}, {url: 'http://localhost:3000', reqNums: 1000}]) {
  if (!opts) throw new Error('Request option required');

  let reqArr = [];

  if (Array.isArray(opts)) {
    for (let i = 0, l = opts.length; i < l; i++) {
      let reqOpt = opts[i];

      if ('string' == typeof reqOpt) {
        opts[i] = Object.assign({}, defaultReqOpts, {url: reqOpt, reqNums: 1});
        reqArr.push(makeRequest(opts[i]))
      } else if ('object' == typeof reqOpt && !Array.isArray(reqOpt) && null !== reqOpt) {
        opts[i] = Object.assign({}, defaultReqOpts, reqOpt);
        if (!('number' == typeof opts[i].reqNums && opts[i].reqNums > 0)) {
          opts[i].reqNums = 1;
        }
        let nums = opts[i].reqNums;
        for (let j = 0; j < nums; j++) {
          reqArr.push(makeRequest(opts[i]));
        }
      } else {
        throw new Error('Request option is invalid');
      }
    }
  } else {
    if ('string' == typeof opts) {
      opts = [Object.assign({}, defaultReqOpts, {url: opts, reqNums: 1})];
      reqArr.push(makeRequest(opts));
    } else if ('object' == typeof opts && !Array.isArray(opts)) {
      opts = [Object.assign({}, defaultReqOpts, opts)];
      if (!('number' == typeof opts[0].reqNums && opts[i].reqNums > 0)) {
        opts[0].reqNums = 1;
      }
      let nums = opts[0].reqNums;
      for (let i = 0; i < nums; i++) {
        reqArr.push(makeRequest(opts[i]));
      }
    } else {
      throw new Error('Request option is invalid');
    }
  }

  let result = await Promise.all(reqArr);

  return result;
}
