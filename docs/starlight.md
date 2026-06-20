# Starlight API

Boa 的 `Starlight` 代表 journey readiness。

這份文件示範：

- 怎麼建立 release
- 怎麼送目前的 starlight 狀態
- 怎麼用 markdown detail 與 metrics
- 怎麼查 trail 與 timeline

## 1. 建立 Release

先建立一個 release，拿到 `release_id`。

```bash
curl -X POST http://127.0.0.1:8000/api/releases \
  -H 'Content-Type: application/json' \
  -d '{
    "product": "LighthouseOS",
    "version": "5.7",
    "secret": "boa-light-57"
  }'
```

範例回應：

```json
{
  "id": 22,
  "product": "LighthouseOS",
  "version": "5.7",
  "secret": "boa-light-57",
  "milestones": []
}
```

## 2. 更新目前 Starlight

端點：

`POST /api/releases/{release_id}/starlight`

payload 重點：

- `starlight`: 0 到 100
- `whisper`: 一行摘要
- `detail.type`: 目前固定是 `markdown`
- `detail.content`: markdown 內容
- `metrics`: 可選
- `observed_on`: 可選，不傳就用今天

```bash
curl -X POST http://127.0.0.1:8000/api/releases/22/starlight \
  -H 'Content-Type: application/json' \
  -d '{
    "starlight": 73,
    "whisper": "Release confidence is gathering steadily.",
    "detail": {
      "type": "markdown",
      "content": "## Completed\n\n- Release confidence is gathering steadily\n- Final integration feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\nToken refresh edge cases still need one more pass."
    },
    "metrics": {
      "done": 16,
      "total": 20,
      "blocked": 1
    },
    "observed_on": "2026-06-18"
  }'
```

範例回應：

```json
{
  "release": "LighthouseOS-5.7",
  "starlight": 73,
  "whisper": "Release confidence is gathering steadily.",
  "detail": {
    "type": "markdown",
    "content": "## Completed\n\n- Release confidence is gathering steadily\n- Final integration feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\nToken refresh edge cases still need one more pass."
  },
  "metrics": {
    "done": 16,
    "total": 20,
    "blocked": 1
  },
  "observed_on": "2026-06-18",
  "trail": [
    {
      "date": "2026-06-18",
      "starlight": 73,
      "whisper": "Release confidence is gathering steadily.",
      "detail": {
        "type": "markdown",
        "content": "## Completed\n\n- Release confidence is gathering steadily\n- Final integration feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\nToken refresh edge cases still need one more pass."
      },
      "metrics": {
        "done": 16,
        "total": 20,
        "blocked": 1
      }
    }
  ]
}
```

## 3. 只更新 Whisper / Detail，不新增 Trail Event

Boa 的 trail 規則是：

- `starlight` 改變時，建立新的 trail event
- `starlight` 不變時，只更新目前狀態，不新增 event

例如同樣維持 `73`：

```bash
curl -X POST http://127.0.0.1:8000/api/releases/22/starlight \
  -H 'Content-Type: application/json' \
  -d '{
    "starlight": 73,
    "whisper": "Documentation updated quietly.",
    "detail": {
      "type": "markdown",
      "content": "Documentation updated.\n\nNo readiness change yet."
    },
    "metrics": {
      "done": 16,
      "total": 20,
      "blocked": 1
    },
    "observed_on": "2026-06-19"
  }'
```

這次會更新 current starlight，但不會多一顆新星。

## 4. 查單一 Release 的 Starlight

端點：

`GET /api/releases/{release_id}/starlight`

```bash
curl http://127.0.0.1:8000/api/releases/22/starlight
```

這會回：

- current starlight
- latest whisper
- markdown detail
- optional metrics
- meaningful trail only

## 5. 從 Timeline 看 Starlight

端點：

`GET /api/timeline`

或單一 galaxy：

`GET /api/timeline?galaxy=lighthouseos`

```bash
curl http://127.0.0.1:8000/api/timeline?galaxy=lighthouseos
```

回傳裡會有：

- `starlight`
- `starlight_trail`

範例片段：

```json
[
  {
    "id": 22,
    "product": "LighthouseOS",
    "version": "5.7",
    "bug_snapshots": [],
    "starlight": {
      "release_id": 22,
      "starlight": 73,
      "whisper": "Documentation updated quietly.",
      "detail": {
        "type": "markdown",
        "content": "Documentation updated.\n\nNo readiness change yet."
      },
      "metrics": {
        "done": 16,
        "total": 20,
        "blocked": 1
      },
      "observed_on": "2026-06-19",
      "updated_at": "2026-06-20T00:00:00+00:00"
    },
    "starlight_trail": [
      {
        "date": "2026-06-18",
        "starlight": 73,
        "whisper": "Release confidence is gathering steadily.",
        "detail": {
          "type": "markdown",
          "content": "## Completed\n\n- Release confidence is gathering steadily\n- Final integration feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\nToken refresh edge cases still need one more pass."
        },
        "metrics": {
          "done": 16,
          "total": 20,
          "blocked": 1
        }
      }
    ]
  }
]
```

## Validation Notes

- `starlight` 必須是 `0..100`
- `detail.type` 目前必須是 `markdown`
- `detail.content` 最多 20KB
- `metrics` 可省略
- 如果有 `metrics`：
  - `done >= 0`
  - `total >= 0`
  - `blocked >= 0`
  - `done <= total`
  - `blocked <= total`

## Recommended Shape

最推薦的 payload 會像這樣：

```json
{
  "starlight": 78,
  "whisper": "Feature integration completed.",
  "detail": {
    "type": "markdown",
    "content": "## Completed\n\n- Feature integration completed\n- Release notes draft is ready\n\n## In Progress\n\n- Final compatibility sweep"
  },
  "metrics": {
    "done": 16,
    "total": 18,
    "blocked": 1
  },
  "observed_on": "2026-06-18"
}
```
