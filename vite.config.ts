import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ai-api-middleware',
      configureServer(server) {
        server.middlewares.use('/api/ai/analyze', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const { query, context } = parsed;
                const apiKey = process.env.GEMINI_API_KEY;

                if (!apiKey) {
                  const financial = context?.financial || {};
                  const revenue = Number(financial.revenue || 0);
                  const transactions = Number(financial.transactions || 0);
                  const avgOrder = transactions > 0 ? (revenue / transactions).toFixed(2) : '0';

                  const summary = `### Business Intelligence Analysis\n\n` +
                    `**Key Metrics:**\n` +
                    `- **Total Revenue:** ₦${revenue.toLocaleString()}\n` +
                    `- **Transactions Logged:** ${transactions}\n` +
                    `- **Average Basket Value:** ₦${Number(avgOrder).toLocaleString()}\n\n` +
                    `**Insight for "${query || 'Store Health'}":**\n` +
                    `1. **Cash Flow & Turnover:** Ensure fast-moving items are restocked on time to maintain consistent daily liquidity.\n` +
                    `2. **Credit & Debt Control:** Keep outstanding credit under the recommended 30% ratio of total inventory value.\n` +
                    `3. **Margin Optimization:** Review low-margin categories and bundle complementary goods for higher average sale tickets.\n\n` +
                    `*(Optional: Set GEMINI_API_KEY in environment variables for custom deep generative insights.)*`;

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ result: summary }));
                  return;
                }

                const systemPrompt = `You are an expert business analyst for Vendora Smart Shop Manager. You have access to the following business data:\n${JSON.stringify(context, null, 2)}\n\nAnalyze this data to answer the user's question accurately. Be concise, use numbers from the provided context, format neatly with markdown headings and bullet points, and give actionable recommendations.`;

                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                const fetchRes = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{
                      parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }]
                    }]
                  })
                });

                const data = await fetchRes.json();
                if (data.error) throw new Error(data.error.message);
                const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis available.";
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ result }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          } else {
            res.statusCode = 405;
            res.end();
          }
        });
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all'
  }
});
