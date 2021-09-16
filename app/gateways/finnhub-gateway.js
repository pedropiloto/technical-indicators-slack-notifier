require('dotenv').config();
const moment = require('moment');
const axios = require('axios');
const Bottleneck = require('bottleneck');

const finnhubToken = `${process.env.FINNHUB_TOKEN}`;
const headers = {};
headers['X-Finnhub-Token'] = finnhubToken;

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 6000, // pick a value that makes sense for your use case
});

// eslint-disable-next-line import/prefer-default-export
const getRSI = async (symbol) => {
  const now = Date.now();
  const sixMonthsAgo = moment().subtract(6, 'months').unix();

  return limiter.wrap(() => axios({
    method: 'get',
    url: `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${sixMonthsAgo}&to=${now}&indicator=rsi&timeperiod=14`,
    headers,
  }))();
};

const getBollingerBands = async (symbol) => {
  const now = Date.now();
  const sixMonthsAgo = moment().subtract(6, 'months').unix();
  return limiter.wrap(() => axios({
    method: 'get',
    url: `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${sixMonthsAgo}&to=${now}&indicator=bbands&timeperiod=20`,
    headers,
  }))();
};

const getSMA = async (symbol, timePeriod) => {
  const now = Date.now();
  const sixMonthsAgo = moment().subtract(300, 'days').unix();
  console.log(`https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${sixMonthsAgo}&to=${now}&indicator=sma&timeperiod=${timePeriod}`)
  return limiter.wrap(() => axios({
    method: 'get',
    url: `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${sixMonthsAgo}&to=${now}&indicator=sma&timeperiod=${timePeriod}`,
    headers,
  }))();
};

const getQuote = async (symbol) => limiter.wrap(() => axios({
  method: 'get',
  url: `https://finnhub.io/api/v1/quote?symbol=${symbol}`,
  headers,
}))();

const getEstimate = async (symbol) => limiter.wrap(() => axios({
  method: 'get',
  url: `https://finnhub.io/api/v1/stock/price-target?symbol=${symbol}`,
  headers,
}))();

module.exports = {
  getRSI, getQuote, getBollingerBands, getSMA, getEstimate,
};
