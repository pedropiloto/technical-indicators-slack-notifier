require('dotenv').config();
const axios = require('axios');
const Bottleneck = require('bottleneck');

const { OPERATIONAL } = require('../utils/constants');
const { log } = require('../utils/logger');

const slackSellService = `${process.env.SLACK_SELL_SERVICE}`;
const slackSellTeam = `${process.env.SLACK_SELL_TEAM}`;
const slackSellToken = `${process.env.SLACK_SELL_TOKEN}`;
const slackBuyService = `${process.env.SLACK_BUY_SERVICE}`;
const slackBuyTeam = `${process.env.SLACK_BUY_TEAM}`;
const slackBuyToken = `${process.env.SLACK_BUY_TOKEN}`;
const SELL_CHANNEL = 'SELL_CHANNEL';
const BUY_CHANNEL = 'BUY_CHANNEL';

const limiter = new Bottleneck({
  reservoir: 40, // initial value
  reservoirRefreshAmount: 40,
  reservoirRefreshInterval: 60 * 1000, // must be divisible by 250

  // also use maxConcurrent and/or minTime for safety
  maxConcurrent: 5,
  minTime: 1000, // pick a value that makes sense for your use case
});

const notifications = {};

const PublishSlackAlert = async (channel, message) => {
  const slackTeam = channel === SELL_CHANNEL ? slackSellTeam : slackBuyTeam;
  const slackService = channel === SELL_CHANNEL ? slackSellService : slackBuyService;
  const slackToken = channel === SELL_CHANNEL ? slackSellToken : slackBuyToken;

  await axios(
    {
      method: 'post',
      url: `https://hooks.slack.com/services/${slackTeam}/${slackService}/${slackToken}`,
      data: message,
      headers: { 'Content-Type': 'application/json' },
    },
  );
  log({
    message: 'published alert to slack with success', type: OPERATIONAL, transactional: true,
  });
};

const indicatorsToSlackView = (indicatorResults) => `| \`QUOTE => ${indicatorResults.current_quote}\` | \`RSI => ${indicatorResults.rsi}\` | \`BB_UPPER => ${indicatorResults.bb_upper}\` | \`BB_LOWER => ${indicatorResults.bb_lower}\` | \`SMA50 => ${indicatorResults.sma50}\` | \`SMA200 => ${indicatorResults.sma200}\` | \`DEATH_CROSS => ${indicatorResults.death_cross_200}\` | \`GOLDEN_CROSS => ${indicatorResults.golden_cross_200}\` |`;

const publishSellAlert = (indicatorResults, sellWeight) => {
  if (!notifications[indicatorResults.symbol]
    || notifications[indicatorResults.symbol].sell_weight
    !== sellWeight) {
    const message = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔥 SELL alert on ${indicatorResults.symbol} with sentiment = ${sellWeight} 🔥`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: indicatorsToSlackView(indicatorResults),
          },
        },
      ],
    };
    PublishSlackAlert(SELL_CHANNEL, message);
    if (!notifications[indicatorResults.symbol]) {
      notifications[indicatorResults.symbol] = {};
    }
    notifications[indicatorResults.symbol].sell_weight = sellWeight;
  } else {
    log({
      message: 'preventing spam',
      type: OPERATIONAL,
      transactional: true,
    });
  }
};

const publishBuyAlert = (indicatorResults, buyWeight) => {
  if (!notifications[indicatorResults.symbol]
    || notifications[indicatorResults.symbol].buy_weight
    !== buyWeight) {
    const message = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `💰 BUY alert on ${indicatorResults.symbol} with sentiment = ${buyWeight} 💰`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: indicatorsToSlackView(indicatorResults),
          },
        },
      ],
    };
    PublishSlackAlert(BUY_CHANNEL, message);
    if (!notifications[indicatorResults.symbol]) {
      notifications[indicatorResults.symbol] = {};
    }
    notifications[indicatorResults.symbol].buy_weight = buyWeight;
  } else {
    log({
      message: 'preventing spam',
      type: OPERATIONAL,
      transactional: true,
    });
  }
};

const publishDeathCrossSlackAlert = (indicatorResults) => {
  const message = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💣 ${indicatorResults.symbol} JUST DID A DEATH CROSS 💣`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: indicatorsToSlackView(indicatorResults),
        },
      },
    ],
  };
  PublishSlackAlert(SELL_CHANNEL, message);
};

const publishGoldenCrossSlackAlert = (indicatorResults) => {
  const message = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚀 ${indicatorResults.symbol} JUST DID A GOLDEN CROSS 🚀`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: indicatorsToSlackView(indicatorResults),
        },
      },
    ],
  };
  PublishSlackAlert(BUY_CHANNEL, message);
};

module.exports = {
  publishSellAlert, publishBuyAlert, publishDeathCrossSlackAlert, publishGoldenCrossSlackAlert,
};
