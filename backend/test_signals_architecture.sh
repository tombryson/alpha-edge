#!/bin/bash

# Test script for TradingView Webhook - Architecture Signal Format
# Tests all signal types according to trading_signal_architecture.md

BASE_URL="http://localhost:8080/api/webhook/tradingview"

echo "========================================="
echo "Testing TradingView Webhook Architecture"
echo "========================================="
echo ""

# CDF Signals
echo "1. CDF BUY Signal (with analyst price target)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","script":"cdf","signal":"buy","analystPriceTarget":"45.50"}'
echo -e "\n"

echo "2. CDF SELL Signal (with analyst price target)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","script":"cdf","signal":"sell","analystPriceTarget":"45.50"}'
echo -e "\n"

# ATR+Oscillator Add Signals
echo "3. ATR Strong Add (1D timeframe)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","signal":"strong_add","timeframe":"1D"}'
echo -e "\n"

echo "4. ATR Weak Add (2D timeframe)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","signal":"weak_add","timeframe":"2D"}'
echo -e "\n"

# ATR+Oscillator Trim Signals
echo "5. ATR Strong Trim (1D timeframe)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","signal":"strong_trim","timeframe":"1D"}'
echo -e "\n"

echo "6. ATR Weak Trim (3D timeframe)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","signal":"weak_trim","timeframe":"3D"}'
echo -e "\n"

# ATR+Oscillator Event Signals
echo "7. DCA Signal (monthly dollar-cost average)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","signal":"dca"}'
echo -e "\n"

echo "8. ATR Stop Hit (full exit)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","signal":"sell"}'
echo -e "\n"

echo "9. REENTRY Signal (after being stopped out)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","signal":"reentry"}'
echo -e "\n"

# Regime Signals
echo "10. Regime BUY (Equities - SPY)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AMEX:SPY","signal":"buy"}'
echo -e "\n"

echo "11. Regime SELL (Commodities - GOLD)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"COMEX:GC1!","signal":"sell"}'
echo -e "\n"

# Legacy Format Support
echo "12. Legacy ADD format (for backwards compatibility)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"ticker":"ASX:BHP","signal":"ADD","strength":"Strong"}'
echo -e "\n"

echo "========================================="
echo "Test Complete"
echo "========================================="
