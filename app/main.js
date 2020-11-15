const Bugsnag = require('@bugsnag/js');
const fetch = require('node-fetch');
const axios = require('axios');
const moment = require('moment');
const rateLimit = require('axios-rate-limit');

require('dotenv').config();
const { log, sendAndCloseLogzio } = require('./utils/logger');
const {
  OPERATIONAL_LOG_TYPE: OPERATIONAL,
  ERROR_SEVERITY: ERROR,
  SELL_ACTION,
  BUY_ACTION,
  SYMBOLS,
  RSI_OVER_BOUGHT_LIMIT,
  RSI_OVER_SOLD_LIMIT,
} = require('./utils/constants');
const { decimalAdjust } = require('./utils/calculation');

const finnhubToken = `${process.env.FINNHUB_TOKEN}`;
const slackSellService = `${process.env.SLACK_SELL_SERVICE}`;
const slackSellTeam = `${process.env.SLACK_SELL_TEAM}`;
const slackSellToken = `${process.env.SLACK_SELL_TOKEN}`;
const slackBuyService = `${process.env.SLACK_BUY_SERVICE}`;
const slackBuyTeam = `${process.env.SLACK_BUY_TEAM}`;
const slackBuyToken = `${process.env.SLACK_BUY_TOKEN}`;

const notifications = {};

const delay = (interval) => new Promise((resolve) => setTimeout(resolve, interval));

const PublishSlackAlert = async (symbol, operation, metric, value) => {
  const slackTeam = operation === SELL_ACTION ? slackSellTeam : slackBuyTeam;
  const slackService = operation === SELL_ACTION ? slackSellService : slackBuyService;
  const slackToken = operation === SELL_ACTION ? slackSellToken : slackBuyToken;
  // eslint-disable-next-line no-nested-ternary
  const message = operation === SELL_ACTION
    ? `\n 🔥 ${operation} alert on ${symbol} because ${metric} = ${value} 🔥 \n`
    : operation === BUY_ACTION ? `\n 💰 ${operation} alert on ${symbol} because ${metric} = ${value} 💰 \n`
      : 'Something weird just happened';
  if (notifications[symbol] !== value) {
    await axios(
      {
        method: 'post',
        url: `https://hooks.slack.com/services/${slackTeam}/${slackService}/${slackToken}`,
        data: { text: message },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    notifications[symbol] = value;

    log({
      message: 'published alert to slack with success', type: OPERATIONAL, transactional: true,
    });
  } else {
    log({
      message: 'preventing spam', type: OPERATIONAL, transactional: true,
    });
  }
};

const analyseSymbol = async (symbol) => {
  const now = Date.now();

  const sixMonthsAgo = moment().subtract('months', 6).unix();

  const requestConfig = {
    method: 'get',
    url: `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${sixMonthsAgo}&to=${now}&indicator=rsi&timeperiod=14`,
    headers: { 'X-Finnhub-Token': finnhubToken },
  };

  const http = rateLimit(axios.create(), { maxRPS: 0.1 });

  const response = await http(requestConfig);

  if (!response.status === 200) {
    log({
      message: `response from finnhub error ${response.status}`, type: OPERATIONAL, transactional: false,
    });
  } else {
    const rsiValues = response.data.rsi;

    if (!rsiValues) {
      log({
        message: 'RSI has no value for some reason', type: OPERATIONAL, transactional: true, error: true,
      });
      return;
    }
    const rsiValue = decimalAdjust('floor', rsiValues[rsiValues.length - 1], -2);

    log({
      message: `RSI calculated for ${symbol} with value ${rsiValue}`, type: OPERATIONAL, transactional: true,
    });

    if (rsiValue <= RSI_OVER_SOLD_LIMIT) {
      PublishSlackAlert(symbol, BUY_ACTION, 'RSI', rsiValue);
    } else if (rsiValue >= RSI_OVER_BOUGHT_LIMIT) {
      PublishSlackAlert(symbol, SELL_ACTION, 'RSI', rsiValue);
    }
  }
};

const start = async () => {
  try {
    while (true) {
      log({
        message: 'starting symbols analysis loop', type: OPERATIONAL, transactional: false,
      });
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < SYMBOLS.length; i++) {
        log({
          message: `analysing ${SYMBOLS[i]}`, type: OPERATIONAL, transactional: true,
        });
        // eslint-disable-next-line no-await-in-loop
        await analyseSymbol(SYMBOLS[i]);
        // eslint-disable-next-line no-await-in-loop
        await delay(1000);
      }
      log({
        message: 'finishing symbols analysis loop', type: OPERATIONAL, transactional: false,
      });
      // eslint-disable-next-line no-await-in-loop
      await delay(7200000);
    }
  } catch (exception) {
    const message = 'Error occured in bot, shutting down. Check the logs for more information.';
    const error = exception.toString();

    log({
      message, error, type: OPERATIONAL, transactional: true, severity: ERROR,
    });

    sendAndCloseLogzio();
    process.exit(1);
  }
};

if (process.env.BUSGNAG_API_KEY) {
  Bugsnag.start({ apiKey: `${process.env.BUSGNAG_API_KEY}` });
}
start();
