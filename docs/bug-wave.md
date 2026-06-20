# Bug Wave API

Boa 的 `Bug Wave` 來自 release 的 bug snapshots。

這份文件示範：

- 怎麼建立一個 release
- 怎麼送 bug snapshot
- 怎麼查 timeline 裡的 bug wave 資料

## 1. 建立 Release

先建立一個 release，拿到 `release_id`。

```bash
curl -X POST http://127.0.0.1:8000/api/releases \
  -H 'Content-Type: application/json' \
  -d '{
    "product": "FortiSASE",
    "version": "26.8",
    "secret": "boa-268"
  }'
```

範例回應：

```json
{
  "id": 21,
  "product": "FortiSASE",
  "version": "26.8",
  "secret": "boa-268",
  "milestones": []
}
```

## 2. 新增 Bug Snapshot

端點：

`POST /api/releases/{release_id}/bug-snapshots`

目前最小 payload 只需要：

- `open_bug_count`
- `signal_type` 可省略，預設是 `total`

```bash
curl -X POST http://127.0.0.1:8000/api/releases/21/bug-snapshots \
  -H 'Content-Type: application/json' \
  -d '{
    "open_bug_count": 37
  }'
```

```bash
curl -X POST http://127.0.0.1:8000/api/releases/21/bug-snapshots \
  -H 'Content-Type: application/json' \
  -d '{
    "open_bug_count": 52,
    "signal_type": "total"
  }'
```

範例回應：

```json
{
  "id": 9,
  "observed_at": "2026-06-20T12:00:00+00:00",
  "signal_type": "total",
  "open_bug_count": 52,
  "quality": "normal",
  "quality_reason": null
}
```

## 3. 查詢單一 Release 的 Bug Snapshots

端點：

`GET /api/releases/{release_id}/bug-snapshots`

```bash
curl http://127.0.0.1:8000/api/releases/21/bug-snapshots
```

範例回應：

```json
[
  {
    "id": 8,
    "observed_at": "2026-06-18T12:00:00+00:00",
    "signal_type": "total",
    "open_bug_count": 37,
    "quality": "normal",
    "quality_reason": null
  },
  {
    "id": 9,
    "observed_at": "2026-06-20T12:00:00+00:00",
    "signal_type": "total",
    "open_bug_count": 52,
    "quality": "normal",
    "quality_reason": null
  }
]
```

## 4. 查 Timeline 內的 Bug Wave 資料

端點：

`GET /api/timeline`

或單一 galaxy：

`GET /api/timeline?galaxy=fortisase`

```bash
curl http://127.0.0.1:8000/api/timeline?galaxy=fortisase
```

回傳裡的 `bug_snapshots` 就是前端畫 Bug Wave 的資料來源。

```json
[
  {
    "id": 21,
    "product": "FortiSASE",
    "version": "26.8",
    "secret": "boa-268",
    "milestones": [],
    "bug_snapshots": [
      {
        "id": 8,
        "observed_at": "2026-06-18T12:00:00+00:00",
        "signal_type": "total",
        "open_bug_count": 37,
        "quality": "normal",
        "quality_reason": null
      },
      {
        "id": 9,
        "observed_at": "2026-06-20T12:00:00+00:00",
        "signal_type": "total",
        "open_bug_count": 52,
        "quality": "normal",
        "quality_reason": null
      }
    ],
    "starlight": null,
    "starlight_trail": []
  }
]
```

## 5. Plugin Ingest 版本

如果是 plugin 在送 bug snapshot，可用：

`POST /api/plugins/{plugin_name}/releases/{release_id}/bug-snapshots`

例如：

```bash
curl -X POST http://127.0.0.1:8000/api/plugins/manual_bug_snapshot/releases/21/bug-snapshots \
  -H 'Content-Type: application/json' \
  -d '{
    "open_bug_count": 44,
    "signal_type": "total"
  }'
```

## Notes

- `open_bug_count` 必須是非負整數。
- Boa 目前會把 `bug_snapshots` 視為 Bug Wave 的原始資料。
- 前端會把這些 snapshot 正規化成海浪高度，不是直接拿絕對 bug count 畫柱狀圖。
