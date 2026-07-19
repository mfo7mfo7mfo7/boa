# Boa Observation Client Examples

These examples are for writing observations into an existing Boa journey.

They are not an admin SDK. They do not create journeys, edit milestones, acknowledge marks, or configure the Engine Room.

## Install

```bash
cd examples/python
pip install requests
```

## First: Create Or Import The Journey In Boa

Before using the client, the journey must already exist in Boa.

Use the Boa UI to:

- Begin a Journey
- Tend an existing Journey
- Bring a Journey from YAML

After that, this client can write the Observation Notebook reading.

## Submit Today's Reading

```python
from boa_client import submit_observation

submit_observation(
    base_url="http://127.0.0.1:8000",
    product="Lantern Vale",
    version="1.6",
    starlight=73,
    summary="The journey is moving with steady light.",
    detail="""## Today

- The integration path is quieter
- The next milestone feels reachable
""",
    open_bug_count=5,
)
```

`summary` maps to Boa's **Where are we now?** field.

`detail` maps to the notebook page body and may contain markdown.

`open_bug_count` maps to **Current Storms**. Omit it when storms are unknown. Send `0` only when there are zero known troubles.

## Use A Release Id

If your system already knows the Boa release id:

```python
from boa_client import submit_observation

submit_observation(
    base_url="http://127.0.0.1:8000",
    release_id=21,
    starlight=73,
    summary="The journey is moving with steady light.",
    open_bug_count=0,
)
```

## Submit Only One Side

Observation only:

```python
from boa_client import submit_today_reading

submit_today_reading(
    release_id=21,
    starlight=73,
    summary="The journey is moving with steady light.",
)
```

Current Storms only:

```python
from boa_client import submit_current_storms

submit_current_storms(
    release_id=21,
    open_bug_count=5,
)
```

## CLI

```bash
python submit_observation.py \
    --base-url http://127.0.0.1:8000 \
    --product "Lantern Vale" \
    --version 1.6 \
    --starlight 73 \
    --summary "The journey is moving with steady light." \
    --open-bugs 5
```

Use `--release-id 21` instead of `--product` and `--version` when you already know the id.

Read the notebook body from a markdown file:

```bash
python submit_observation.py \
    --release-id 21 \
    --starlight 73 \
    --summary "The journey is moving with steady light." \
    --detail-file today.md
```

## Optional Supporting Facts

Supporting facts belong behind the Starlight reading. They are optional.

```python
submit_today_reading(
    release_id=21,
    starlight=73,
    summary="The journey is moving with steady light.",
    metrics={"done": 8, "total": 12, "blocked": 2},
)
```

## Partial Success

By default, `submit_observation` stops on the first failed API call.

Use `allow_partial=True` when you want Boa to attempt both the notebook reading and current storms:

```python
result = submit_observation(
    release_id=21,
    starlight=73,
    summary="The journey is moving with steady light.",
    open_bug_count=5,
    allow_partial=True,
)

print(result.ok)
print(result.observation_ok)
print(result.storms_ok)
print(result.errors)
```

## Environment Defaults

```bash
export BOA_BASE_URL=http://127.0.0.1:8000
export BOA_PRODUCT="Lantern Vale"
export BOA_VERSION=1.6

python submit_observation.py \
    --starlight 73 \
    --summary "The journey is moving with steady light." \
    --open-bugs 5
```

## AI Integration Prompt

If another AI agent or automation needs to connect to Boa, start with:

[Observation Client AI Prompt](../../docs/observation-client-ai-prompt.md)
