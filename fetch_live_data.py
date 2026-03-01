"""
Antigravity Bond Dashboard - Live Data Fetcher
Fetches DXY, US10Y, and VIX from Yahoo Finance and writes to live_data.json
Run this script in the background to keep the simulator auto-updating.
"""

import yfinance as yf
import json
import time
import os

OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "live_data.json")
INTERVAL_SECONDS = 60  # refresh every minute

TICKERS = {
    "dxy":  "DX-Y.NYB",   # US Dollar Index
    "us10y": "^TNX",       # US 10-Year Treasury Yield
    "vix":  "^VIX",        # CBOE Volatility Index
}

def classify_dxy(change_pct):
    """Convert DXY % change to simulator bucket."""
    if change_pct >= 0.30:
        return "up"
    elif change_pct <= -0.30:
        return "down"
    return "neutral"

def classify_yields(change_pct):
    """Convert yield % change to simulator bucket."""
    if change_pct >= 1.5:     # yields spiking (bps move)
        return "up"
    elif change_pct <= -1.5:
        return "down"
    return "neutral"

def classify_vix(level):
    """Convert VIX level to simulator bucket."""
    if level >= 30:
        return "high"
    elif level >= 20:
        return "mid"
    return "low"

def fetch():
    data = {}
    try:
        for key, ticker_sym in TICKERS.items():
            t = yf.Ticker(ticker_sym)
            hist = t.history(period="5d", interval="1d")
            if hist.empty or len(hist) < 2:
                print(f"[WARN] No data for {ticker_sym}")
                data[key] = {"value": None, "change_pct": 0, "bucket": "neutral"}
                continue

            today_close = float(hist["Close"].iloc[-1])
            prev_close  = float(hist["Close"].iloc[-2])
            change_pct  = ((today_close - prev_close) / prev_close) * 100

            if key == "dxy":
                bucket = classify_dxy(change_pct)
            elif key == "us10y":
                bucket = classify_yields(change_pct)
            else:  # vix
                bucket = classify_vix(today_close)

            data[key] = {
                "value": round(today_close, 3),
                "change_pct": round(change_pct, 3),
                "bucket": bucket,
            }

        data["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        data["market_open"] = True

        with open(OUTPUT_FILE, "w") as f:
            json.dump(data, f, indent=2)

        print(f"[{data['timestamp']}] Data saved → {OUTPUT_FILE}")
        print(f"  DXY  : {data['dxy']['value']}  ({data['dxy']['change_pct']:+.2f}%)  → {data['dxy']['bucket']}")
        print(f"  US10Y: {data['us10y']['value']}  ({data['us10y']['change_pct']:+.2f}%)  → {data['us10y']['bucket']}")
        print(f"  VIX  : {data['vix']['value']}  ({data['vix']['change_pct']:+.2f}%)  → {data['vix']['bucket']}")

    except Exception as e:
        print(f"[ERROR] {e}")

def run_forever():
    print("=== Antigravity Live Data Feed ===")
    print(f"Fetching every {INTERVAL_SECONDS}s. Press Ctrl+C to stop.\n")
    while True:
        fetch()
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    import sys
    if "--once" in sys.argv:
        fetch()
    else:
        run_forever()
