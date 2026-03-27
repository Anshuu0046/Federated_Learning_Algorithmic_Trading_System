import realData from '../assets/real_stock_data.json';

// Serve realistic stock price data from historical market JSON
const TICKERS = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN'];
const TICKER_NAMES = ['Apple Inc.', 'Alphabet Inc.', 'Tesla Inc.', 'Microsoft Corp.', 'Amazon.com'];

function seededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

export function generateStockData(tickerIndex, numPoints = 200) {
    const ticker = TICKERS[tickerIndex];
    if (realData && realData[ticker]) {
        // Return exactly numPoints if available
        const data = realData[ticker];
        return data.slice(-numPoints);
    }
    // Fallback if data not found (e.g. during dev before python script runs)
    return [];
}

export function generatePredictions(actualData, tickerIndex) {
    const rng = seededRandom(tickerIndex * 500 + 7);
    return actualData.map((d, i) => {
        const noise = (rng() - 0.5) * d.price * 0.03;
        const lagBias = i > 0 ? (actualData[i - 1].price - d.price) * 0.3 : 0;
        return {
            ...d,
            predicted: Math.round((d.price + noise + lagBias) * 100) / 100,
        };
    });
}

export function generateSignals(data) {
    const shortWindow = 5;
    const longWindow = 20;

    return data.map((d, i) => {
        if (i < longWindow) return { ...d, signal: 'HOLD' };

        const shortMA =
            data.slice(i - shortWindow, i).reduce((s, x) => s + x.price, 0) / shortWindow;
        const longMA =
            data.slice(i - longWindow, i).reduce((s, x) => s + x.price, 0) / longWindow;

        let signal = 'HOLD';
        if (shortMA > longMA * 1.005) signal = 'BUY';
        else if (shortMA < longMA * 0.995) signal = 'SELL';

        return { ...d, signal };
    });
}

export function calculateReturns(data) {
    let cumulative = 0;
    return data.map((d, i) => {
        if (i === 0) return { ...d, dailyReturn: 0, cumulativeReturn: 0 };
        const dailyReturn = (d.price - data[i - 1].price) / data[i - 1].price;
        cumulative += dailyReturn;
        return {
            ...d,
            dailyReturn: Math.round(dailyReturn * 10000) / 10000,
            cumulativeReturn: Math.round(cumulative * 10000) / 10000,
        };
    });
}

export function calculateSharpeRatio(returns, windowSize = 20) {
    const result = [];
    for (let i = 0; i < returns.length; i++) {
        if (i < windowSize) {
            result.push({ date: returns[i].date, sharpe: 0 });
            continue;
        }
        const window = returns.slice(i - windowSize, i).map((r) => r.dailyReturn);
        const mean = window.reduce((s, v) => s + v, 0) / window.length;
        const std = Math.sqrt(
            window.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / window.length
        );
        const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;
        result.push({ date: returns[i].date, sharpe: Math.round(sharpe * 100) / 100 });
    }
    return result;
}

export function calculateDrawdown(data) {
    let peak = data[0].price;
    return data.map((d) => {
        if (d.price > peak) peak = d.price;
        const drawdown = (d.price - peak) / peak;
        return {
            date: d.date,
            drawdown: Math.round(drawdown * 10000) / 10000,
            price: d.price,
        };
    });
}

export { TICKERS, TICKER_NAMES };
