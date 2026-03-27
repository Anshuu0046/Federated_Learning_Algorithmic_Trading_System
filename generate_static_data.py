import json
import yfinance as yf
import pandas as pd
import os

TICKERS = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN']

def generate_json():
    print("Fetching real stock data from Yahoo Finance for the React Frontend...")
    all_data = {}
    
    # Create assets directory if it doesn't exist
    os.makedirs('src/assets', exist_ok=True)
    
    for ticker in TICKERS:
        try:
            # We fetch 1 year of data, then grab the last 200 trading days
            df = yf.download(ticker, period="1y", interval="1d", progress=False)
            
            # YFinance returns a MultiIndex for columns depending on pandas version
            if isinstance(df.columns, pd.MultiIndex):
                # Flatten it
                df.columns = df.columns.get_level_values(0)
                
            df = df.dropna()
            
            if len(df) > 200:
                df = df.tail(200)
            
            records = []
            for date, row in df.iterrows():
                # Date comes from the index
                d_str = date.strftime('%Y-%m-%d')
                records.append({
                    "date": d_str,
                    "price": round(float(row['Close']), 2),
                    "open": round(float(row['Open']), 2),
                    "high": round(float(row['High']), 2),
                    "low": round(float(row['Low']), 2),
                    "volume": int(row['Volume'])
                })
            all_data[ticker] = records
            print(f"✅ {ticker} fetched ({len(records)} records ending {records[-1]['date']})")
        except Exception as e:
            print(f"❌ Error fetching {ticker}: {e}")

    with open('src/assets/real_stock_data.json', 'w') as f:
        json.dump(all_data, f)
    print("Data saved to src/assets/real_stock_data.json successfully!")

if __name__ == "__main__":
    generate_json()
