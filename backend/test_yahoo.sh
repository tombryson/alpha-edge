#!/bin/bash

echo "Testing Yahoo Finance ticker lookup..."
echo ""

echo "1. Testing 'Boab Metals Ltd' (should return BML):"
curl -s "https://query2.finance.yahoo.com/v1/finance/search?q=Boab%20Metals%20Ltd&quotesCount=10" -H "User-Agent: Mozilla/5.0" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for q in data['quotes']:
    if q.get('exchange') in ['ASX', 'AUS']:
        ticker = q['symbol'].replace('.AX', '')
        print(f\"   Found: {ticker} (Exchange: {q['exchange']})\")
        break
"

echo ""
echo "2. Testing 'Critica Mining Ltd' (should return CRI):"
curl -s "https://query2.finance.yahoo.com/v1/finance/search?q=Critica%20Mining%20Ltd&quotesCount=10" -H "User-Agent: Mozilla/5.0" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for q in data['quotes']:
    if q.get('exchange') in ['ASX', 'AUS']:
        ticker = q['symbol'].replace('.AX', '')
        print(f\"   Found: {ticker} (Exchange: {q['exchange']})\")
        break
"

echo ""
echo "Done!"
