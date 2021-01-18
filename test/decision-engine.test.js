const {
  BELOW_OPERATOR, ABOVE_OPERATOR, ABSOLUTE_VARIANCE, PERCENTAGE_VARIANCE, EQUAL_ASSERT_TYPE,
} = require('../app/utils/constants');
const { evaluate } = require('../app/decision-engine');

describe('decision-engine', () => {
  describe('evaluate', () => {
    describe('when no multiple rule conditions', () => {
      let ruleMetric = 'custom_indicator';
      let ruleOperator;
      let ruleValue;
      let ruleType;
      const ruleWeight = 1;
      let customIndicatorValue;
      let rule = [];
      const indicatorResults = {};
      beforeEach(() => {
        rule = [
          {
            metric: ruleMetric,
            operator: ruleOperator,
            value: ruleValue,
            assert_type: ruleType,
            weight: ruleWeight,
          },
        ];
      });
      describe('when rule with matching metric', () => {
        beforeEach(() => {
          indicatorResults[ruleMetric] = customIndicatorValue;
        });

        describe('when rule condition in ABSOLUTE_VARIANCE assert type', () => {
          beforeAll(() => { ruleType = ABSOLUTE_VARIANCE; });

          describe('when condition is set to above', () => {
            beforeAll(() => { ruleOperator = ABOVE_OPERATOR; });

            describe('when the difference is positive', () => {
              beforeAll(() => { ruleValue = 66; customIndicatorValue = 70; });

              it('should return the percentage difference multiplied by the weight', () => {
                expect(evaluate(indicatorResults, rule)).toBe(4);
              });
            });
            describe('when the difference is negative', () => {
              beforeAll(() => { ruleValue = 74; });
              it('should return the absolute difference multiplied by the weight', () => {
                expect(evaluate(indicatorResults, rule)).toBe(-4);
              });
            });
          });
          describe('when condition is set to below', () => {
            beforeAll(() => { ruleOperator = BELOW_OPERATOR; });
            describe('when the difference is positive', () => {
              beforeAll(() => { ruleValue = 34; customIndicatorValue = 26; });
              it('should return the absolute difference multiplied by the weight', () => {
                expect(evaluate(indicatorResults, rule)).toBe(8);
              });
            });
            describe('when the difference is negative', () => {
              beforeAll(() => { ruleValue = 34; customIndicatorValue = 40; });
              it('should return the absolute difference multiplied by the weight', () => {
                expect(evaluate(indicatorResults, rule)).toBe(-6);
              });
            });
          });
        });
        describe('when rule condition in PERCENTAGE_VARIANCE assert type', () => {
          beforeAll(() => { ruleType = PERCENTAGE_VARIANCE; });

          describe('when condition is set to above', () => {
            beforeAll(() => { ruleOperator = ABOVE_OPERATOR; });

            describe('when the difference is positive', () => {
              beforeAll(() => { ruleValue = 66; customIndicatorValue = 70; });

              it('should return the percentage difference multiplied by the weight', () => {
                expect(evaluate(indicatorResults, rule)).toBe(6.06);
              });
            });
            describe('when the difference is negative', () => {
              beforeAll(() => { ruleValue = 200; customIndicatorValue = 160; });
              it('should return the absolute difference multiplied by the weight', () => {
                expect(evaluate(indicatorResults, rule)).toBe(-20);
              });
            });
          });
          describe('when condition is set to below', () => {
            beforeAll(() => { ruleOperator = BELOW_OPERATOR; });
            describe('when the difference is positive', () => {
              beforeAll(() => { ruleValue = 200; customIndicatorValue = 160; });
              it('should return the absolute difference multiplied by the weight', () => {
                expect(evaluate(indicatorResults, rule)).toBe(20);
              });
            });
            describe('when the difference is negative', () => {
              beforeAll(() => { ruleValue = 66; customIndicatorValue = 70; });
              it('should return the absolute difference multiplied by the weight', () => {
                expect(evaluate(indicatorResults, rule)).toBe(-6.07);
              });
            });
          });
        });
        describe('when rule condition in EQUAL_ASSERT_TYPE assert type', () => {
          beforeAll(() => { ruleType = EQUAL_ASSERT_TYPE; });

          describe('when the indicator value is equal to the rule expected value', () => {
            beforeAll(() => { ruleValue = 1; customIndicatorValue = 1; });

            it('should return the weight', () => {
              expect(evaluate(indicatorResults, rule)).toBe(1);
            });
          });
          describe('when the indicator value is different from the rule expected value', () => {
            beforeAll(() => { ruleValue = 1; customIndicatorValue = 0; });
            it('should return 0', () => {
              expect(evaluate(indicatorResults, rule)).toBe(0);
            });
          });
        });
        describe('when rule condition in unknown assert type', () => {
          beforeAll(() => {
            ruleType = 'UNKNOWN'; customIndicatorValue = 0;
          });
          it('should throw an error', () => {
            expect(() => evaluate(indicatorResults, rule)).toThrowError(`Unknown rule condition assert_type: ${ruleType}`);
          });
        });
      });
      describe('when rule have a no matching metric', () => {
        beforeAll(() => {
          ruleMetric = 'not-equal-to-dummy';
          indicatorResults.dummy = customIndicatorValue;
        });
        it('should throw an error', () => {
          expect(() => evaluate(indicatorResults, rule)).toThrowError(`Unknown rule condition metric ${ruleMetric}`);
        });
      });
    });
  });
});
