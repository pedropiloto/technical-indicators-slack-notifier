const {
  CROSS_DEATH_200, CROSS_GOLDEN_200,
} = require('../app/utils/constants');
const { verifySMA } = require('../app/sma-cross-tracker');

describe('sma-cross-tracker', () => {
  describe('verifySMA', () => {
    describe('when there is previous data', () => {
      let previousSMA50; let
        previousSMA200;
      beforeEach(() => {
        verifySMA('symbol', previousSMA50, previousSMA200);
      });

      describe('when sma50 and sma200 are equal', () => {
        describe('when sma50 were higher than sma200', () => {
          beforeAll(() => { previousSMA50 = 100; previousSMA200 = 90; });
          it('should return CROSS_DEATH_200', () => {
            expect(verifySMA('symbol', 30, 30)).toBe(CROSS_DEATH_200);
          });
        });
        describe('when sma50 were lower than sma200', () => {
          beforeAll(() => { previousSMA50 = 90; previousSMA200 = 100; });
          it('should return CROSS_GOLDEN_200', () => {
            expect(verifySMA('symbol', 30, 30)).toBe(CROSS_GOLDEN_200);
          });
        });
      });
      describe('when sma50 is higher than sma200', () => {
        describe('when sma50 were lower than sma200', () => {
          beforeAll(() => {
            previousSMA50 = 50; previousSMA200 = 100;
          });
          it('should return CROSS_GOLDEN_200', () => {
            expect(verifySMA('symbol', 90, 80)).toBe(CROSS_GOLDEN_200);
          });
        });
        describe('when sma50 were higher than sma200', () => {
          beforeAll(() => {
            previousSMA50 = 120; previousSMA200 = 100;
          });
          it('should return undefined', () => {
            expect(verifySMA('symbol', 90, 80)).toBe(undefined);
          });
        });
      });
      describe('when sma50 is lower than sma200', () => {
        describe('when sma50 were lower than sma200', () => {
          beforeAll(() => {
            previousSMA50 = 50; previousSMA200 = 100;
          });
          it('should return undefined', () => {
            expect(verifySMA('symbol', 80, 90)).toBe(undefined);
          });
        });
        describe('when sma50 were higher than sma200', () => {
          beforeAll(() => {
            previousSMA50 = 120; previousSMA200 = 100;
          });
          it('should return CROSS_DEATH_200', () => {
            expect(verifySMA('symbol', 80, 90)).toBe(CROSS_DEATH_200);
          });
        });
      });
    });
  });
});
