#!/usr/bin/env python3
"""Self-test for boa_client.py without external test dependencies.

Run with: python3 test_boa_client_self.py
"""

from __future__ import annotations

import json
import sys
import types
from unittest.mock import Mock, patch

if "requests" not in sys.modules:
    requests_stub = types.ModuleType("requests")
    requests_stub.RequestException = Exception
    requests_stub.request = Mock()
    sys.modules["requests"] = requests_stub

from boa_client import (
    BoaClient,
    BoaClientError,
    BoaHttpError,
    find_release,
    get_timeline,
    resolve_release_id,
    submit_bug_snapshot,
    submit_observation,
    submit_starlight,
)


def _mock_response(status_code: int, json_body: dict | list) -> Mock:
    response = Mock()
    response.status_code = status_code
    response.ok = 200 <= status_code < 300
    response.json.return_value = json_body
    response.text = json.dumps(json_body)
    return response


def test_find_release():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.return_value = _mock_response(200, [{"id": 1, "product": "Lantern Vale", "version": "1.6"}])
        result = find_release(product="Lantern Vale", version="1.6")
        assert result["id"] == 1


def test_resolve_missing_does_not_create():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.return_value = _mock_response(200, [])
        try:
            resolve_release_id(product="Missing", version="1.0")
            raise AssertionError("expected BoaClientError")
        except BoaClientError:
            pass
        assert mock_request.call_count == 1


def test_starlight_range():
    try:
        submit_starlight(release_id=1, starlight=101, summary="Too high")
        raise AssertionError("expected BoaClientError")
    except BoaClientError:
        pass


def test_submit_starlight():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.return_value = _mock_response(200, {"starlight": {"starlight": 73}})
        result = submit_starlight(release_id=1, starlight=73, summary="Advancing")
        assert result["starlight"]["starlight"] == 73


def test_submit_bug_snapshot_zero():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.return_value = _mock_response(201, {"open_bug_count": 0})
        result = submit_bug_snapshot(release_id=1, open_bug_count=0)
        assert result["open_bug_count"] == 0


def test_submit_observation_both():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.side_effect = [
            _mock_response(200, {"starlight": {"starlight": 73}}),
            _mock_response(201, {"open_bug_count": 5}),
        ]
        result = submit_observation(
            release_id=1,
            starlight=73,
            summary="The journey is moving with steady light.",
            open_bug_count=5,
        )
        assert result.ok


def test_submit_observation_unknown_storms_skips_bug_snapshot():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.return_value = _mock_response(200, {"starlight": {"starlight": 73}})
        result = submit_observation(
            release_id=1,
            starlight=73,
            summary="The journey is moving with steady light.",
            open_bug_count=None,
        )
        assert result.ok
        assert not result.storms_requested
        assert mock_request.call_count == 1


def test_submit_observation_partial():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.side_effect = [
            _mock_response(200, {"starlight": {"starlight": 73}}),
            _mock_response(500, {"detail": "boom"}),
        ]
        result = submit_observation(
            release_id=1,
            starlight=73,
            summary="The journey is moving with steady light.",
            open_bug_count=5,
            allow_partial=True,
        )
        assert result.starlight_ok
        assert not result.bug_wave_ok


def test_submit_observation_failure():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.side_effect = [
            _mock_response(200, {"starlight": {"starlight": 73}}),
            _mock_response(500, {"detail": "boom"}),
        ]
        try:
            submit_observation(
                release_id=1,
                starlight=73,
                summary="The journey is moving with steady light.",
                open_bug_count=5,
            )
            raise AssertionError("expected BoaHttpError")
        except BoaHttpError:
            pass


def test_boa_client():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.return_value = _mock_response(200, {"starlight": {"starlight": 80}})
        client = BoaClient("http://boa.test")
        result = client.submit_starlight(release_id=1, starlight=80, summary="Steady")
        assert result["starlight"]["starlight"] == 80


def test_get_timeline():
    with patch("boa_client.requests.request") as mock_request:
        mock_request.return_value = _mock_response(200, [{"id": 1, "product": "A", "version": "1.0"}])
        result = get_timeline()
        assert len(result) == 1


def main():
    tests = [
        test_find_release,
        test_resolve_missing_does_not_create,
        test_starlight_range,
        test_submit_starlight,
        test_submit_bug_snapshot_zero,
        test_submit_observation_both,
        test_submit_observation_unknown_storms_skips_bug_snapshot,
        test_submit_observation_partial,
        test_submit_observation_failure,
        test_boa_client,
        test_get_timeline,
    ]
    for test in tests:
        test()
        print(f"ok: {test.__name__}")
    print("All self-tests passed.")


if __name__ == "__main__":
    main()
