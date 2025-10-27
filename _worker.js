// _worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // === 1. 補助金検索API ===
    if (url.pathname === "/api/search") {
      const keyword = url.searchParams.get("keyword") || "事業";
      const acceptance = url.searchParams.get("acceptance") || 1;

      const apiUrl = `https://api.jgrants-portal.go.jp/exp/v1/public/subsidies?keyword=${encodeURIComponent(keyword)}&acceptance=${acceptance}&sort=acceptance_end_datetime&order=ASC`;

      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json();
      const results = (data.result || []).slice(0, 5).map(x => ({
        id: x.subsidy_id,
        name: x.subsidy_name,
        agency: x.implementing_agency,
        acceptance_end: x.acceptance_end_datetime,
        _source: "Jグランツポータル（https://www.jgrants-portal.go.jp）",
      }));

      return Response.json(results);
    }

    // === 2. ルートでHTMLを返す ===
    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jグランツ補助金検索</title>
        <style>
          body { font-family: sans-serif; margin: 2em; background: #f8f9fa; }
          h1 { color: #007f89; }
          input, button { padding: 0.5em; font-size: 1em; }
          .card { background: #fff; padding: 1em; margin-top: 1em; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <h1>Jグランツ補助金検索</h1>
        <input id="keyword" placeholder="キーワードを入力" value="事業">
        <button onclick="search()">検索</button>
        <div id="results"></div>

        <script>
          async function search() {
            const kw = document.getElementById('keyword').value;
            const res = await fetch('/api/search?keyword=' + encodeURIComponent(kw));
            const data = await res.json();
            const div = document.getElementById('results');
            div.innerHTML = data.map(d => 
              '<div class="card"><b>' + d.name + '</b><br>' +
              '実施機関: ' + (d.agency || '不明') + '<br>' +
              '受付終了: ' + (d.acceptance_end || '-') + '<br>' +
              '<small>' + d._source + '</small></div>'
            ).join('');
          }
        </script>
      </body>
      </html>
    `;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  },
};
