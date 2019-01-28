// make a simple test that will connect to mongo and perform digest auth

const https = require('https');
const crypto = require('crypto');

const createOptions = (method, uri) => {
  return {
    host: 'cloud.mongodb.com',
    path: uri,
    method: method,
    headers: { }
  }
};

/**
 * make a promise of the https request
 * @param {*} options 
 */
const sendRequest = (options) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (data) => {
        body += data
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: JSON.parse(body)
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });


    req.end();
  });
} 

/**
 * Iterate over the digest header and extract the values
 * @param {string} header
 */
const readDigest = (header) => {
  const digest = header.replace(/^(Digest )/, '').split(', ');

  const output = {};
  digest.forEach((cred) => {
    let items = cred.split('=');
    output[items[0].toLowerCase()] = items[1].replace(/\"/g, '');
  });

  // addition of the counter and client nonce
  output.nc= '0000001';
  output.cnonce = crypto.pseudoRandomBytes(8).toString('hex');

  return output;
}

/**
 * Take the WWW-Authenicate header, split it and create the response
 * @param {*} options 
 * @param {string} wwwAuth 
 * @param {string} username 
 * @param {string} password 
 */
const createAuthHeader = (options, wwwAuth, credentials) => {

  // Remove the leading Digest
  if (wwwAuth.startsWith('Digest')) {
    const digest = readDigest(wwwAuth);

    let ha1 = `${credentials.username}:${digest.realm}:${credentials.password}`;
    ha1 = crypto.createHash(digest.algorithm).update(ha1).digest('hex');

    let ha2 = `${options.method}:${options.path}`;
    ha2 = crypto.createHash(digest.algorithm).update(ha2).digest('hex');

    let response = `${ha1}:${digest.nonce}:${digest.nc}:${digest.cnonce}:${digest.qop}:${ha2}`;
    response = crypto.createHash(digest.algorithm).update(response).digest('hex')


    return `Digest username="${credentials.username}", realm="${digest.realm}", nonce="${digest.nonce}", uri="${options.path}", qop="${digest.qop}", nc="${digest.nc}", cnonce="${digest.cnonce}", response="${response}", algorithm="${digest.algorithm}"`;
  } else {
    throw 'Not a digest authentication request';
  }
};

/**
 * Call the Mongo API and go through the digest authentication cycle
 * @param {*} options 
 * @param {*} credentials 
 */
const invokeRequest = (options, credentials) => {
  // 1. initiate contact with the server
  return sendRequest(options)
    .then((res) => {
      // 2. handle the 401
      if (res.statusCode === 401) {
        // 3. generate the digest auth header
        authHeader = createAuthHeader(options, res.headers['www-authenticate'], credentials);

        // 4. send the response
        options.headers = {
          Authorization: authHeader,
          'content-type': 'application/json'
        }

        return sendRequest(options);
      }
    });
};

/**
 * return a list of the projects from mongo
 */
const getProjects = () => {
  let options = createOptions('GET', '/api/atlas/v1.0/groups');
  let credentials = {
    username: process.env.USER,
    password: process.env.API_KEY
  };
  invokeRequest(options, credentials)
  .then((res) => {
    console.log(res.data);
  })
  .catch((err) => {
    console.error(err);
  })
}

// test - make sure we can read the projects
getProjects();
