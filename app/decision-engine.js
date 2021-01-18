const {
  BELOW_OPERATOR,
  ABOVE_OPERATOR,
  ABSOLUTE_VARIANCE,
  PERCENTAGE_VARIANCE,
  CURRENT_QUOTE,
  EQUAL_ASSERT_TYPE,
} = require('./utils/constants');
const { decimalAdjust } = require('./utils/calculation');

const getValueForCondition = (indicatorResults, ruleCondition) => (
  ruleCondition.value === CURRENT_QUOTE
    ? indicatorResults.current_quote
    : ruleCondition.value
);

const evaluateAbsoluteAssertType = (indicatorResults, ruleCondition) => {
  const value = getValueForCondition(indicatorResults, ruleCondition);
  if (ruleCondition.operator === ABOVE_OPERATOR) {
    return (indicatorResults[ruleCondition.metric] - value) * ruleCondition.weight;
  } if (ruleCondition.operator === BELOW_OPERATOR) {
    return (value - indicatorResults[ruleCondition.metric]
    ) * ruleCondition.weight;
  }
  throw Error(`Unknown rule condition operator: ${ruleCondition.operator}`);
};

const evaluatePercentageAssertType = (indicatorResults, ruleCondition) => {
  const value = getValueForCondition(indicatorResults, ruleCondition);
  const difference = (
    (indicatorResults[ruleCondition.metric] - value)
    / value
  ) * 100;
  if (ruleCondition.operator === ABOVE_OPERATOR) {
    return (difference * ruleCondition.weight);
  } if (ruleCondition.operator === BELOW_OPERATOR) {
    return (-difference) * ruleCondition.weight;
  }
  throw Error(`Unknown rule condition operator: ${ruleCondition.operator}`);
};

const evaluateEqualAssertType = (indicatorResults, ruleCondition) => {
  const value = getValueForCondition(indicatorResults, ruleCondition);
  return indicatorResults[ruleCondition.metric] === value ? ruleCondition.weight : 0;
};

const evaluate = (indicatorResults, rule) => {
  let totalweight = 0;
  rule.forEach((ruleCondition) => {
    if (typeof indicatorResults[ruleCondition.metric] !== 'undefined') {
      switch (ruleCondition.assert_type) {
        case ABSOLUTE_VARIANCE:
          totalweight += +evaluateAbsoluteAssertType(indicatorResults, ruleCondition);
          break;
        case PERCENTAGE_VARIANCE:
          totalweight += evaluatePercentageAssertType(indicatorResults, ruleCondition);
          break;
        case EQUAL_ASSERT_TYPE:
          totalweight += +evaluateEqualAssertType(indicatorResults, ruleCondition);
          break;
        default:
          throw Error(`Unknown rule condition assert_type: ${ruleCondition.assert_type}`);
      }
    } else {
      throw Error(`Unknown rule condition metric ${ruleCondition.metric}`);
    }
  });
  return decimalAdjust('floor', totalweight, -2);
};
module.exports = {
  evaluate,
};
