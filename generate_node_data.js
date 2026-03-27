import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TICKERS = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN'];

async function fetchYahooFinance(ticker) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = await res.json();

    const result = parsed.chart.result[0];
    const timestamps = result.timestamp;
    const ohlcv = result.indicators.quote[0];

    const records = [];
    // We only want the last 200 days
    const startIdx = Math.max(0, timestamps.length - 200);

    for (let i = startIdx; i < timestamps.length; i++) {
        if (ohlcv.close[i] !== null && ohlcv.close[i] !== undefined) {
            records.push({
                date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                price: Number(ohlcv.close[i].toFixed(2)),
                open: Number(ohlcv.open[i].toFixed(2)),
                high: Number(ohlcv.high[i].toFixed(2)),
                low: Number(ohlcv.low[i].toFixed(2)),
                volume: ohlcv.volume[i] || 0
            });
        }
    }
    return records;
}

async function run() {
    console.log("Fetching real stock data using Node.js Native Fetch...");
    const allData = {};

    // Ensure assets dir exists
    const dir = path.join(__dirname, 'src', 'assets');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    for (const ticker of TICKERS) {
        try {
            const data = await fetchYahooFinance(ticker);
            allData[ticker] = data;
            console.log(`✅ ${ticker} fetched (${data.length} records ending ${data[data.length - 1].date})`);
        } catch (e) {
            console.error(`❌ Error fetching ${ticker}: ${e.message}`);
        }
    }

    fs.writeFileSync(path.join(dir, 'real_stock_data.json'), JSON.stringify(allData, null, 2));
    console.log("Data saved to src/assets/real_stock_data.json successfully!");
}

run();
