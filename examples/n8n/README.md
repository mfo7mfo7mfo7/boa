# n8n + curl Observation Examples For Boa

These snippets write observations into an existing Boa journey.

They do not create journeys, edit milestones, acknowledge marks, or configure the Engine Room.

## 1. Resolve An Existing Journey

Create or import the journey in Boa first. Then resolve its id.

### curl

```bash
BASE_URL=http://127.0.0.1:8000
PRODUCT="Lantern Vale"
VERSION="1.6"
GALAXY="lantern-vale"

curl -s "$BASE_URL/api/timeline?galaxy=$GALAXY" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); p='$PRODUCT'; v='$VERSION'; r=[x for x in d if x['product']==p and x['version']==v]; print(r[0]['id'] if r else '')"
```

If the result is empty, stop and create or import the journey in Boa.

### n8n HTTP Request node

**Method:** GET  
**URL:** `http://127.0.0.1:8000/api/timeline?galaxy=lantern-vale`

Then use a Code node:

```js
const product = "Lantern Vale";
const version = "1.6";
const releases = $input.all()[0].json;
const found = releases.find((release) => release.product === product && release.version === version);

if (!found) {
  throw new Error("Journey not found. Create or import it in Boa first.");
}

return { json: { release_id: found.id } };
```

## 2. Submit Today's Reading

This writes Starlight, Where are we now?, Page Notes, and optional facts.

### curl

```bash
RELEASE_ID=21

curl -s -X PUT "http://127.0.0.1:8000/api/releases/$RELEASE_ID/observation" \
  -H "Content-Type: application/json" \
  -d '{
    "starlight": 73,
    "whisper": "The journey is moving with steady light.",
    "detail": {"type": "markdown", "content": "## Today\n\n- The integration path is quieter"},
    "metrics": {"done": 8, "total": 12, "blocked": 2},
    "observed_on": "2026-07-19"
  }'
```

### n8n HTTP Request node

**Method:** PUT  
**URL:** `http://127.0.0.1:8000/api/releases/{{ $json.release_id }}/observation`  
**Body:** JSON

```json
{
  "starlight": 73,
  "whisper": "The journey is moving with steady light.",
  "detail": {
    "type": "markdown",
    "content": "## Today\n\n- The integration path is quieter"
  },
  "metrics": {
    "done": 8,
    "total": 12,
    "blocked": 2
  },
  "observed_on": "2026-07-19"
}
```

## 3. Submit Current Storms

Send this only when the current known-troubles count is known.

Blank or unknown means do not call this endpoint. `0` means zero known troubles and should be sent.

### curl

```bash
RELEASE_ID=21

curl -s -X POST "http://127.0.0.1:8000/api/releases/$RELEASE_ID/bug-snapshots" \
  -H "Content-Type: application/json" \
  -d '{"open_bug_count": 5, "signal_type": "total"}'
```

### n8n HTTP Request node

**Method:** POST  
**URL:** `http://127.0.0.1:8000/api/releases/{{ $json.release_id }}/bug-snapshots`  
**Body:** JSON

```json
{
  "open_bug_count": 5,
  "signal_type": "total"
}
```

## 4. Submit Both

Use two HTTP Request nodes in sequence:

1. Submit Today's Reading
2. Submit Current Storms

If one call fails, report which part failed. Do not expose the API names to end users; say whether the reading or storms could not be recorded.

## Python Helper

For Python, see [examples/python](../python/README.md).

```python
from boa_client import submit_observation

submit_observation(
    base_url="http://127.0.0.1:8000",
    product="Lantern Vale",
    version="1.6",
    starlight=73,
    summary="The journey is moving with steady light.",
    open_bug_count=5,
)
```

## AI Integration Prompt

Use [Observation Client AI Prompt](../../docs/observation-client-ai-prompt.md) when asking another AI agent to build the connection.
