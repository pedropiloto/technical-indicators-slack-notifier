const Bugsnag = require('@bugsnag/js');
require('dotenv').config();
const { log, sendAndCloseLogzio } = require('./utils/logger');
const {
  OPERATIONAL_LOG_TYPE: OPERATIONAL,
  ERROR_SEVERITY: ERROR,
  CROSS_DEATH_200,
  CROSS_GOLDEN_200,
} = require('./utils/constants');
const { decimalAdjust } = require('./utils/calculation');
const {
  getRSI, getQuote, getBollingerBands, getSMA,
} = require('./gateways/finnhub-gateway');
const {
  publishSellAlert, publishBuyAlert, publishDeathCrossSlackAlert, publishGoldenCrossSlackAlert,
} = require('./gateways/slack-gateway');
const { verifySMA } = require('./sma-cross-tracker');
const { SELL_RULE, BUY_RULE } = require('./utils/rules');
const DecisionEngine = require('./decision-engine');

const delay = (interval) => new Promise((resolve) => setTimeout(resolve, interval));

const proccessResults = (indicatorResults) => {
  try {
    const sellWeight = DecisionEngine.evaluate(indicatorResults, SELL_RULE);
    const buyWeight = DecisionEngine.evaluate(indicatorResults, BUY_RULE);

    if (sellWeight > 0) publishSellAlert(indicatorResults, sellWeight);
    if (buyWeight > 5) publishBuyAlert(indicatorResults, buyWeight);

    log({
      message: `Resume for symbol ${indicatorResults.symbol}`,
      rsi: indicatorResults.rsi,
      bb_upper: indicatorResults.bb_upper,
      bb_lower: indicatorResults.bb_lower,
      current_quote: indicatorResults.current_quote,
      sma50: indicatorResults.sma50,
      sell_weight: sellWeight,
      buy_weight: buyWeight,
      type: OPERATIONAL,
      transactional: true,
    });
  } catch (exception) {
    const message = 'Error occurred processing results';
    const error = exception.toString();
    const stackTrace = exception.stack;

    log({
      message,
      error,
      errorr_trace: stackTrace,
      type: OPERATIONAL,
      transactional: true,
      severity: ERROR,
    });
  }
};

const analyseSymbol = async (symbol) => {

  let rsiResponse
  let quoteResponse
  let bollingerBandsResponse
  let sma50Response
  let sma200Response

  try {
    rsiResponse = await getRSI(symbol)

  } catch (e) {
    log({
      message: 'Error during retrieving rsi indicator', error: e.toString(), type: OPERATIONAL, transactional: false, severity: ERROR,
    });
    return;
  }
  try {
    quoteResponse = await getQuote(symbol)
  } catch (e) {
    log({
      message: 'Error during retrieving quote', error: e.toString(), type: OPERATIONAL, transactional: false, severity: ERROR,
    });
    return;
  }
  try {
    bollingerBandsResponse = await getBollingerBands(symbol)
  } catch (e) {
    log({
      message: 'Error during retrieving bollingerBands indicator', error: e.toString(), type: OPERATIONAL, transactional: false, severity: ERROR,
    });
    return;
  }
  try {
    sma50Response = await getSMA(symbol, 50)
  } catch (e) {
    log({
      message: 'Error during retrieving sma50 indicator', error: e.toString(), type: OPERATIONAL, transactional: false, severity: ERROR,
    });
    return;
  }
  // try {
  //   sma200Response = await getSMA(symbol, 200)
  // } catch (e) {
  //   log({
  //     message: 'Error during retrieving sma200 indicator', error: e.toString(), type: OPERATIONAL, transactional: false, severity: ERROR,
  //   });
  //   return;
  // }
  const rsiValues = rsiResponse.data.rsi;

  if (!rsiValues) {
    log({
      message: 'RSI has no value for some reason', type: OPERATIONAL, transactional: true, severity: ERROR,
    });
    return;
  }
  const rsiValue = decimalAdjust('floor', rsiValues[rsiValues.length - 1], -2);

  const currentQuote = quoteResponse.data.c;

  const bollingerBandsLower = decimalAdjust('floor', bollingerBandsResponse.data.lowerband[
    bollingerBandsResponse.data.upperband.length - 1
  ], -2);

  const bollingerBandsUpper = decimalAdjust('floor', bollingerBandsResponse.data.upperband[
    bollingerBandsResponse.data.upperband.length - 1
  ], -2);

  const sma50 = decimalAdjust('floor', sma50Response.data.sma[sma50Response.data.sma.length - 1], -2);
  // const sma200 = decimalAdjust('floor', sma200Response.data.sma[sma200Response.data.sma.length - 1], -2);

  proccessResults({
    symbol,
    rsi: rsiValue,
    bb_upper: bollingerBandsUpper,
    bb_lower: bollingerBandsLower,
    current_quote: currentQuote,
    sma50
  });
};

const start = async () => {
  const symbols = process.env.SYMBOLS.split(',');
  while (true) {
    log({
      message: 'starting symbols analysis loop', type: OPERATIONAL, transactional: false,
    });
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < symbols.length; i++) {
      log({
        message: `analysing ${symbols[i]}`, type: OPERATIONAL, transactional: true,
      });
      try {
        // eslint-disable-next-line no-await-in-loop
        await analyseSymbol(symbols[i]);
      } catch (e) {
        log({
          message: `Error analysing symbol ${symbols[i]}`, error: e.toString(), type: OPERATIONAL, transactional: false, severity: ERROR,
        });
      }
    }
    log({
      message: 'finishing symbols analysis loop', type: OPERATIONAL, transactional: false,
    });
    // eslint-disable-next-line no-await-in-loop
    await delay(720000);
  }
  // await analyseSymbol('CRM');
};

if (process.env.BUSGNAG_API_KEY) {
  Bugsnag.start({ apiKey: `${process.env.BUSGNAG_API_KEY}` });
}
try {
  start();
} catch (exception) {
  const message = 'Error occured in bot, shutting down. Check the logs for more information.';
  const error = exception.toString();
  const stackTrace = exception.stack;

  log({
    message,
    error,
    errorr_trace: stackTrace,
    type: OPERATIONAL,
    transactional: true,
    severity: ERROR,
  });
  start();
}
