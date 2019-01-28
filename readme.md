# Mongo API
This is a wrapper for commuincating with the Mongo Atals API through node, the purpose of this is so that you can provision mogo clusters and administer them through node and serverless infrastructure. 

The Flow of the [digest authentication](https://en.wikipedia.org/wiki/Digest_access_authentication) is a two step process,
1. initate request 
2. read the 401 response and craft the return header along with the request

## Usage
You must have node installed and then you must also have a Mongo Atlas account with an API Key.

``` bash
API_KEY="[YOUR API KEY]" USER="[YOUR USER]" node index.js
```