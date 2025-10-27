import os, json
from fastmcp import MCP
import httpx

API_BASE = "https://api.jgrants-portal.go.jp/exp/v1/public"
ACCESS_KEY = os.getenv("ACCESS_KEY")  # 仲間限定の簡易鍵（任意）

mcp = MCP()  # 認証はプロキシ側で付与（Claude設定でトークンを渡す運用も可）

def _headers():
    # ここでUser-Agentや出典表記方針をコメントとして明記
    return {"Accept": "application/json"}

async def _get_json(path, params=None):
    async with httpx.AsyncClient(timeout=30.0, headers=_headers()) as client:
        r = await client.get(f"{API_BASE}{path}", params=params)
        r.raise_for_status()
        return r.json()

@mcp.tool()
async def ping() -> str:
    """接続確認用。'pong' を返す。"""
    return "pong"

@mcp.tool()
async def search_subsidies(
    keyword: str = "事業",
    acceptance: int = 1,
    sort: str = "acceptance_end_datetime",
    order: str = "ASC",
    target_area_search: str | None = None,
    industry: str | None = None,
) -> list[dict]:
    """
    Jグランツの補助金を検索し、上位5件を返す。
    出典：Jグランツポータル（https://www.jgrants-portal.go.jp）
    """
    params = {
        "keyword": keyword,
        "sort": sort,
        "order": order,
        "acceptance": acceptance,
    }
    if target_area_search:
        params["target_area_search"] = target_area_search
    if industry:
        params["industry"] = industry

    data = await _get_json("/subsidies", params=params)
    result = data.get("result", [])[:5]
    # 出典明記を常に添える
    for x in result:
        x["_source"] = "Jグランツポータル（https://www.jgrants-portal.go.jp）"
    return result

@mcp.tool()
async def get_subsidy_detail(subsidy_id: str) -> dict:
    """
    指定IDの補助金詳細を取得する。
    出典：Jグランツポータル（https://www.jgrants-portal.go.jp）
    """
    data = await _get_json(f"/subsidies/id/{subsidy_id}")
    result = data.get("result", data)
    if isinstance(result, list):
        result = result[0] if result else {}
    if isinstance(result, dict):
        result["_source"] = "Jグランツポータル（https://www.jgrants-portal.go.jp）"
    return result

if __name__ == "__main__":
    # ローカル起動（HTTP）
    mcp.run_http(host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
