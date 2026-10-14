"""
서울 실시간 도시데이터(인구) 수집기
- 서울 열린데이터광장 citydata_ppltn API를 호출해 CSV로 누적 저장
- 표준 라이브러리만 사용 (별도 설치 불필요)

사용법
  1) 인증키를 환경변수로 지정
       Windows(PowerShell):  $env:SEOUL_API_KEY="발급받은키"
       macOS/Linux:          export SEOUL_API_KEY=발급받은키
  2) 1회 수집:        python collect.py
     10분마다 반복:   python collect.py --loop 600

출력
  data/ppltn.csv     : 수집 시점의 실제 인구·혼잡도 (분석의 핵심)
  data/forecast.csv  : 같은 시점에 API가 내놓은 향후 12시간 예측값
"""

import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

# ── 수집할 장소 ─────────────────────────────────────────────
# 장소명은 열린데이터광장 '서울시 주요 121장소 목록.xlsx'의 이름과 정확히 같아야 함.
# 목록에서 성수 관련 장소명을 확인해 수정하세요.
PLACES = [
    "성수카페거리",
    "서울숲공원",
]

API_KEY = os.environ.get("SEOUL_API_KEY", "")
BASE = "http://openapi.seoul.go.kr:8088/{key}/json/citydata_ppltn/1/5/{place}"
KST = timezone(timedelta(hours=9))
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

PPLTN_FIELDS = [
    "collected_at", "AREA_NM", "AREA_CD", "PPLTN_TIME",
    "AREA_CONGEST_LVL", "AREA_PPLTN_MIN", "AREA_PPLTN_MAX",
    "MALE_PPLTN_RATE", "FEMALE_PPLTN_RATE",
    "PPLTN_RATE_10", "PPLTN_RATE_20", "PPLTN_RATE_30",
    "PPLTN_RATE_40", "PPLTN_RATE_50", "PPLTN_RATE_60",
    "RESNT_PPLTN_RATE", "NON_RESNT_PPLTN_RATE", "AREA_CONGEST_MSG",
]
FCST_FIELDS = [
    "collected_at", "AREA_NM", "PPLTN_TIME",
    "FCST_TIME", "FCST_CONGEST_LVL", "FCST_PPLTN_MIN", "FCST_PPLTN_MAX",
]


def fetch(place: str) -> dict | None:
    url = BASE.format(key=API_KEY, place=urllib.parse.quote(place))
    with urllib.request.urlopen(url, timeout=20) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    # 응답 최상위 키 이름이 바뀌어도 동작하도록 citydata_ppltn 목록을 찾아냄
    for key, value in payload.items():
        if "citydata_ppltn" in key and isinstance(value, list) and value:
            return value[0]
    # 오류 응답(인증키 오류, 장소명 오류 등)
    result = payload.get("RESULT") or payload.get("result") or payload
    print(f"  [경고] {place}: 데이터 없음 → {result}", file=sys.stderr)
    return None


def append_rows(path: str, fields: list[str], rows: list[dict]) -> None:
    if not rows:
        return
    new_file = not os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        if new_file:
            writer.writeheader()
        writer.writerows(rows)


def collect_once() -> None:
    if not API_KEY:
        sys.exit("SEOUL_API_KEY 환경변수가 없습니다. 인증키를 먼저 설정하세요.")
    os.makedirs(OUT_DIR, exist_ok=True)
    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    ppltn_rows, fcst_rows = [], []

    for place in PLACES:
        try:
            item = fetch(place)
        except Exception as e:  # 네트워크 오류 등은 건너뛰고 다음 장소 진행
            print(f"  [오류] {place}: {e}", file=sys.stderr)
            continue
        if not item:
            continue
        row = {"collected_at": now, **item}
        ppltn_rows.append(row)
        for fc in item.get("FCST_PPLTN") or []:
            fcst_rows.append({
                "collected_at": now,
                "AREA_NM": item.get("AREA_NM"),
                "PPLTN_TIME": item.get("PPLTN_TIME"),
                **fc,
            })
        print(f"  {now} {item.get('AREA_NM')}: {item.get('AREA_CONGEST_LVL')} "
              f"({item.get('AREA_PPLTN_MIN')}~{item.get('AREA_PPLTN_MAX')}명)")

    append_rows(os.path.join(OUT_DIR, "ppltn.csv"), PPLTN_FIELDS, ppltn_rows)
    append_rows(os.path.join(OUT_DIR, "forecast.csv"), FCST_FIELDS, fcst_rows)


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--loop":
        interval = int(sys.argv[2])
        print(f"{interval}초 간격으로 수집합니다. 중지: Ctrl+C")
        while True:
            collect_once()
            time.sleep(interval)
    else:
        collect_once()
