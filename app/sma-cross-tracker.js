const { log } = require('./utils/logger');
const { OPERATIONAL, CROSS_DEATH_200, CROSS_GOLDEN_200 } = require('./utils/constants');

const NEGATIVE_POLARITY = 'NEGATIVE_POLARITY';
const POSITIVE_POLARITY = 'POSITIVE_POLARITY';
const NEUTRAL_POLARITY = 'NEUTRAL_POLARITY';

const smaCrossTracker = {};

const verifySMA = (symbol, sma50, sma200) => {
  let cross;
  if (
    !smaCrossTracker[symbol]
    || !smaCrossTracker[symbol].sma50
    || !smaCrossTracker[symbol].sma200) {
    smaCrossTracker[symbol] = { sma50, sma200 };
    return cross;
  }

  const oldDifference = smaCrossTracker[symbol].sma50 - smaCrossTracker[symbol].sma200;
  const currentDifference = sma50 - sma200;

  // if sma 200 and sma 50 are crossing -> current difference is 0
  if (currentDifference === 0) {
    log({
      message: `Crossing SMA200 with SMA50 ${symbol} difference = 0`, type: OPERATIONAL, transactional: true,
    });
    if (oldDifference < 0) {
      return CROSS_GOLDEN_200;
    } if (oldDifference > 0) {
      return CROSS_DEATH_200;
    }
  }

  // eslint-disable-next-line no-nested-ternary
  const oldSma50Polarity = oldDifference === 0
    ? NEUTRAL_POLARITY : oldDifference < 0
      ? NEGATIVE_POLARITY : POSITIVE_POLARITY;
  // eslint-disable-next-line no-nested-ternary
  const currentSma50Polarity = currentDifference === 0
    ? NEUTRAL_POLARITY : currentDifference < 0
      ? NEGATIVE_POLARITY
      : POSITIVE_POLARITY;

  if (oldSma50Polarity !== currentSma50Polarity) {
    log({
      message: `Crossing SMA200 with SMA50 ${symbol} with old_difference ${oldSma50Polarity} and current_difference = ${currentDifference}`, type: OPERATIONAL, transactional: true,
    });
    if (currentSma50Polarity === NEGATIVE_POLARITY) {
      cross = CROSS_DEATH_200;
    }
    if (currentSma50Polarity === POSITIVE_POLARITY) {
      cross = CROSS_GOLDEN_200;
    }
  }
  smaCrossTracker[symbol] = { sma50, sma200 };
  return cross;
};

module.exports = {
  verifySMA,
};
