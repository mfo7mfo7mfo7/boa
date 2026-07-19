from __future__ import annotations

import json
import sys
import types
from unittest.mock import Mock, patch

import pytest

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
    submit_current_storms,
    submit_observation,
    submit_starlight,
    submit_today_reading,
)


class TestFindRelease:
    @patch("boa_client.requests.request")
    def test_find_release_returns_matching_existing_journey(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(
            200,
            [
                {"id": 1, "product": "Alpha", "version": "1.0"},
                {"id": 2, "product": "Lantern Vale", "version": "1.6"},
            ],
        )

        result = find_release(product="Lantern Vale", version="1.6")

        assert result is not None
        assert result["id"] == 2
        _, _, kwargs = mock_request.mock_calls[0]
        assert kwargs["params"] == {"galaxy": "lantern-vale"}

    @patch("boa_client.requests.request")
    def test_resolve_release_id_does_not_create_missing_journey(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(200, [])

        with pytest.raises(BoaClientError, match="Journey not found"):
            resolve_release_id(product="Missing", version="1.0")

        assert mock_request.call_count == 1


class TestSubmitTodayReading:
    @patch("boa_client.requests.request")
    def test_submit_today_reading_validates_range(self, mock_request: Mock) -> None:
        with pytest.raises(BoaClientError):
            submit_today_reading(release_id=1, starlight=101, summary="Too high")

    @patch("boa_client.requests.request")
    def test_submit_today_reading_requires_summary(self, mock_request: Mock) -> None:
        with pytest.raises(BoaClientError):
            submit_today_reading(release_id=1, starlight=73, summary="")

    @patch("boa_client.requests.request")
    def test_submit_today_reading_sends_observation_payload(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(200, {"starlight": {"starlight": 73}})

        result = submit_today_reading(
            release_id=1,
            starlight=73,
            summary="The journey is moving with steady light.",
            detail="Tests passed",
            metrics={"done": 8, "total": 12, "blocked": 2},
            observed_on="2026-07-05",
        )

        assert result["starlight"]["starlight"] == 73
        _, args, kwargs = mock_request.mock_calls[0]
        assert args[0] == "PUT"
        assert args[1].endswith("/api/releases/1/observation")
        assert kwargs["json"]["whisper"] == "The journey is moving with steady light."
        assert kwargs["json"]["detail"] == {"type": "markdown", "content": "Tests passed"}
        assert kwargs["json"]["metrics"]["done"] == 8

    @patch("boa_client.requests.request")
    def test_submit_starlight_alias_uses_observation_endpoint(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(200, {"starlight": {"starlight": 55}})

        submit_starlight(release_id=1, starlight=55, summary="Steady")

        _, args, _ = mock_request.mock_calls[0]
        assert args[0] == "PUT"
        assert args[1].endswith("/api/releases/1/observation")


class TestSubmitCurrentStorms:
    @patch("boa_client.requests.request")
    def test_submit_current_storms_sends_zero_as_known_zero(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(201, {"open_bug_count": 0})

        result = submit_current_storms(release_id=1, open_bug_count=0)

        assert result["open_bug_count"] == 0
        _, args, kwargs = mock_request.mock_calls[0]
        assert args[0] == "POST"
        assert args[1].endswith("/api/releases/1/bug-snapshots")
        assert kwargs["json"]["open_bug_count"] == 0

    @patch("boa_client.requests.request")
    def test_submit_bug_snapshot_alias_rejects_negative(self, mock_request: Mock) -> None:
        with pytest.raises(BoaClientError):
            submit_bug_snapshot(release_id=1, open_bug_count=-1)


class TestSubmitObservation:
    @patch("boa_client.requests.request")
    def test_reading_only_does_not_submit_storms(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(200, {"starlight": {"starlight": 73}})

        result = submit_observation(
            release_id=1,
            starlight=73,
            summary="The journey is moving with steady light.",
        )

        assert result.ok
        assert result.observation_ok
        assert not result.storms_requested
        assert mock_request.call_count == 1

    @patch("boa_client.requests.request")
    def test_storms_unknown_does_not_submit_bug_snapshot(self, mock_request: Mock) -> None:
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

    @patch("boa_client.requests.request")
    def test_storms_zero_is_submitted(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(201, {"open_bug_count": 0})

        result = submit_observation(release_id=1, open_bug_count=0)

        assert result.ok
        assert result.storms_ok
        _, _, kwargs = mock_request.mock_calls[0]
        assert kwargs["json"]["open_bug_count"] == 0

    @patch("boa_client.requests.request")
    def test_both(self, mock_request: Mock) -> None:
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
        assert result.observation_ok
        assert result.storms_ok

    @patch("boa_client.requests.request")
    def test_partial_failure_with_allow_partial(self, mock_request: Mock) -> None:
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

        assert result.observation_ok
        assert not result.storms_ok
        assert any("Current Storms failed" in err for err in result.errors or [])

    @patch("boa_client.requests.request")
    def test_failure_without_allow_partial_raises(self, mock_request: Mock) -> None:
        mock_request.side_effect = [
            _mock_response(200, {"starlight": {"starlight": 73}}),
            _mock_response(500, {"detail": "boom"}),
        ]

        with pytest.raises(BoaHttpError):
            submit_observation(
                release_id=1,
                starlight=73,
                summary="The journey is moving with steady light.",
                open_bug_count=5,
            )

    @patch("boa_client.requests.request")
    def test_product_version_resolves_existing_journey_only(self, mock_request: Mock) -> None:
        mock_request.side_effect = [
            _mock_response(200, [{"id": 9, "product": "Lantern Vale", "version": "1.6"}]),
            _mock_response(200, {"starlight": {"starlight": 55}}),
        ]

        result = submit_observation(
            product="Lantern Vale",
            version="1.6",
            starlight=55,
            summary="A small light is visible.",
        )

        assert result.release_id == 9
        assert result.observation_ok


class TestBoaClient:
    @patch("boa_client.requests.request")
    def test_thin_wrapper_calls_underlying(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(200, {"starlight": {"starlight": 80}})
        client = BoaClient("http://boa.test")

        result = client.submit_today_reading(release_id=1, starlight=80, summary="Steady")

        assert result["starlight"]["starlight"] == 80
        _, args, _ = mock_request.mock_calls[0]
        assert args[1].startswith("http://boa.test")


class TestGetTimeline:
    @patch("boa_client.requests.request")
    def test_get_timeline(self, mock_request: Mock) -> None:
        mock_request.return_value = _mock_response(200, [{"id": 1, "product": "A", "version": "1.0"}])
        result = get_timeline()
        assert len(result) == 1


def _mock_response(status_code: int, json_body: dict | list) -> Mock:
    response = Mock()
    response.status_code = status_code
    response.ok = 200 <= status_code < 300
    response.json.return_value = json_body
    response.text = json.dumps(json_body)
    return response
