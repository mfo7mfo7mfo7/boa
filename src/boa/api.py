"""FastAPI application for Boa."""

from __future__ import annotations

import asyncio
import contextlib
import os
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from starlette.responses import FileResponse, PlainTextResponse
from starlette.staticfiles import StaticFiles

from boa.domain import (
    BugSnapshotSubmission,
    Milestone,
    MilestoneRecord,
    NotificationRecord,
    PluginDescriptor,
    ReleaseBlueprint,
    ReleaseStarlight,
    ReleaseRecord,
    ReleaseTimeline,
    ReminderState,
    StarlightDetail,
    StarlightEvent,
    StarlightMetrics,
    StarlightStatus,
)
from boa.storage import BoaStorage, slugify_galaxy
from boa.yaml_io import BlueprintValidationError, dump_release_blueprint, load_release_blueprint


MAX_PRODUCT_LENGTH = 120
MAX_VERSION_LENGTH = 80
MAX_SECRET_LENGTH = 200
MAX_MILESTONE_NAME_LENGTH = 160
MAX_OWNER_LENGTH = 160
MAX_ACK_NOTE_LENGTH = 2000
MAX_WHISPER_LENGTH = 280
MAX_STARLIGHT_DETAIL_LENGTH = 20 * 1024


def _clean_text(value: str, *, field: str, max_length: int) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field} must not be empty.")
    if len(cleaned) > max_length:
        raise ValueError(f"{field} must be {max_length} characters or fewer.")
    return cleaned


class ReleaseCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product: str
    version: str
    secret: str

    @field_validator("product")
    @classmethod
    def clean_product(cls, value: str) -> str:
        return _clean_text(value, field="product", max_length=MAX_PRODUCT_LENGTH)

    @field_validator("version")
    @classmethod
    def clean_version(cls, value: str) -> str:
        return _clean_text(value, field="version", max_length=MAX_VERSION_LENGTH)

    @field_validator("secret")
    @classmethod
    def clean_secret(cls, value: str) -> str:
        return _clean_text(value, field="secret", max_length=MAX_SECRET_LENGTH)


class ReleaseUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product: str
    version: str
    secret: str

    @field_validator("product")
    @classmethod
    def clean_product(cls, value: str) -> str:
        return _clean_text(value, field="product", max_length=MAX_PRODUCT_LENGTH)

    @field_validator("version")
    @classmethod
    def clean_version(cls, value: str) -> str:
        return _clean_text(value, field="version", max_length=MAX_VERSION_LENGTH)

    @field_validator("secret")
    @classmethod
    def clean_secret(cls, value: str) -> str:
        return _clean_text(value, field="secret", max_length=MAX_SECRET_LENGTH)


class MilestoneCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    expected: date
    owner: str

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return _clean_text(value, field="name", max_length=MAX_MILESTONE_NAME_LENGTH)

    @field_validator("owner")
    @classmethod
    def clean_owner(cls, value: str) -> str:
        return _clean_text(value, field="owner", max_length=MAX_OWNER_LENGTH)


class MilestoneUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    expected: date
    owner: str

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return _clean_text(value, field="name", max_length=MAX_MILESTONE_NAME_LENGTH)

    @field_validator("owner")
    @classmethod
    def clean_owner(cls, value: str) -> str:
        return _clean_text(value, field="owner", max_length=MAX_OWNER_LENGTH)


class AckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    secret: str
    note: str = ""

    @field_validator("secret")
    @classmethod
    def clean_secret(cls, value: str) -> str:
        return _clean_text(value, field="secret", max_length=MAX_SECRET_LENGTH)

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str) -> str:
        if len(value.strip()) > MAX_ACK_NOTE_LENGTH:
            raise ValueError(f"note must be {MAX_ACK_NOTE_LENGTH} characters or fewer.")
        return value


class BugSnapshotCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    signal_type: str = "total"
    open_bug_count: int = Field(ge=0)

    @field_validator("signal_type")
    @classmethod
    def clean_signal_type(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned:
            raise ValueError("signal_type must not be empty.")
        if len(cleaned) > 80:
            raise ValueError("signal_type must be 80 characters or fewer.")
        if not cleaned.replace("_", "").replace("-", "").isalnum():
            raise ValueError("signal_type must contain only letters, numbers, underscores, or hyphens.")
        return cleaned


class StarlightDetailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    content: str

    @field_validator("type")
    @classmethod
    def validate_type(cls, value: str) -> str:
        if value.strip().lower() != "markdown":
            raise ValueError("detail.type must equal markdown.")
        return "markdown"

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if len(value) > MAX_STARLIGHT_DETAIL_LENGTH:
            raise ValueError(f"detail.content must be {MAX_STARLIGHT_DETAIL_LENGTH} characters or fewer.")
        return value


class StarlightMetricsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    done: int = Field(ge=0)
    total: int = Field(ge=0)
    blocked: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_totals(self) -> "StarlightMetricsRequest":
        if self.done > self.total:
            raise ValueError("done must be less than or equal to total.")
        if self.blocked > self.total:
            raise ValueError("blocked must be less than or equal to total.")
        return self


class StarlightUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    starlight: int = Field(ge=0, le=100)
    whisper: str
    detail: StarlightDetailRequest
    metrics: StarlightMetricsRequest | None = None
    observed_on: date | None = None

    @field_validator("whisper")
    @classmethod
    def clean_whisper(cls, value: str) -> str:
        return _clean_text(value, field="whisper", max_length=MAX_WHISPER_LENGTH)


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    name: str
    expected: date
    owner: str


class ReleaseResponse(BaseModel):
    id: int
    product: str
    version: str
    secret: str
    milestones: list[MilestoneResponse]


class ReleaseBlueprintResponse(BaseModel):
    product: str
    version: str
    secret: str
    milestones: list[MilestoneResponse]


class AckResponse(BaseModel):
    acked: bool
    acked_at: str
    note: str


class BugSnapshotResponse(BaseModel):
    id: int
    observed_at: str
    signal_type: str
    open_bug_count: int
    quality: str
    quality_reason: str | None


class ReminderRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    as_of: date


class NotificationResponse(BaseModel):
    id: int
    release_id: int
    milestone_id: int
    type: str
    sent_at: str


class ReminderStateResponse(BaseModel):
    release_id: int
    milestone_id: int
    milestone_name: str
    expected: date
    owner: str
    acked_at: str | None
    pending_types: list[str]
    notifications: list[NotificationResponse]


class PluginDescriptorResponse(BaseModel):
    name: str
    version: str
    capabilities: list[str]
    endpoint: str | None = None


class AppConfigResponse(BaseModel):
    stale_kickoff_days: int
    journey_fold_days: int


class TimelineMilestoneResponse(BaseModel):
    id: int
    name: str
    expected: date
    owner: str
    acked_at: str | None
    ack_note: str | None


class ReleaseTimelineResponse(BaseModel):
    id: int
    product: str
    version: str
    secret: str
    milestones: list[TimelineMilestoneResponse]
    bug_snapshots: list[BugSnapshotResponse]
    starlight: "StarlightStatusResponse | None" = None
    starlight_trail: list["StarlightEventResponse"] = []


class StarlightDetailResponse(BaseModel):
    type: str
    content: str


class StarlightMetricsResponse(BaseModel):
    done: int
    total: int
    blocked: int


class StarlightStatusResponse(BaseModel):
    release_id: int
    starlight: int
    whisper: str
    detail: StarlightDetailResponse
    metrics: StarlightMetricsResponse | None = None
    observed_on: date
    updated_at: str


class StarlightEventResponse(BaseModel):
    date: date
    starlight: int
    whisper: str
    detail: StarlightDetailResponse
    metrics: StarlightMetricsResponse | None = None


class ReleaseStarlightResponse(BaseModel):
    release: str
    starlight: int
    whisper: str
    detail: StarlightDetailResponse
    metrics: StarlightMetricsResponse | None = None
    observed_on: date
    trail: list[StarlightEventResponse]


def create_app(storage: BoaStorage | None = None) -> FastAPI:
    db_path = Path(os.getenv("BOA_DB_PATH", Path(__file__).resolve().parents[2] / "boa.db"))

    async def reminder_scheduler(app: FastAPI) -> None:
        while True:
            app.state.storage.generate_due_notifications(as_of=date.today())
            await asyncio.sleep(60 * 60)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.storage = storage or BoaStorage(db_path)
        app.state.storage.initialize()
        app.state.storage.generate_due_notifications(as_of=date.today())
        app.state.reminder_scheduler = asyncio.create_task(reminder_scheduler(app))
        try:
            yield
        finally:
            app.state.reminder_scheduler.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await app.state.reminder_scheduler

    app = FastAPI(title="Boa API", version="0.1.0", lifespan=lifespan)
    app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

    def get_storage() -> BoaStorage:
        return app.state.storage

    @app.get("/", response_class=FileResponse)
    def index() -> Path:
        return Path(__file__).parent / "static" / "index.html"

    @app.get("/{galaxy_slug}", response_class=FileResponse)
    def galaxy_page(galaxy_slug: str) -> Path:
        if not slugify_galaxy(galaxy_slug):
            raise HTTPException(status_code=404, detail="Galaxy was not found.")
        return Path(__file__).parent / "static" / "index.html"

    @app.get("/api/health")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/config", response_model=AppConfigResponse)
    def app_config() -> AppConfigResponse:
        journey_fold_days = _journey_fold_days()
        return AppConfigResponse(
            stale_kickoff_days=journey_fold_days,
            journey_fold_days=journey_fold_days,
        )

    @app.get("/api/timeline", response_model=list[ReleaseTimelineResponse])
    def list_release_timelines(
        galaxy: str | None = Query(default=None),
        storage: BoaStorage = Depends(get_storage),
    ) -> list[ReleaseTimelineResponse]:
        storage.generate_due_notifications(as_of=date.today())
        normalized_galaxy = slugify_galaxy(galaxy) if galaxy is not None else None
        return [_timeline_response(item) for item in storage.list_release_timelines(normalized_galaxy)]

    @app.get("/api/plugins", response_model=list[PluginDescriptorResponse])
    def list_plugins(
        storage: BoaStorage = Depends(get_storage),
    ) -> list[PluginDescriptorResponse]:
        return [_plugin_response(item) for item in storage.list_plugins()]

    @app.post("/api/releases", response_model=ReleaseResponse, status_code=status.HTTP_201_CREATED)
    def create_release(
        request: ReleaseCreateRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> ReleaseResponse:
        blueprint = ReleaseBlueprint(
            product=request.product,
            version=request.version,
            secret=request.secret,
            milestones=(
                Milestone(name="Kickoff", expected=date.today(), owner="pm"),
                Milestone(
                    name="GA Release",
                    expected=date.today() + timedelta(days=90),
                    owner="manager",
                ),
            ),
        )
        try:
            release = storage.create_release(blueprint)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return _release_response(storage, release)

    @app.get("/api/releases", response_model=list[ReleaseResponse])
    def list_releases(
        storage: BoaStorage = Depends(get_storage),
    ) -> list[ReleaseResponse]:
        return [_release_response(storage, release) for release in storage.list_releases()]

    @app.get("/api/releases/{release_id}", response_model=ReleaseResponse)
    def get_release(
        release_id: int,
        storage: BoaStorage = Depends(get_storage),
    ) -> ReleaseResponse:
        try:
            return _release_response(storage, storage.get_release(release_id))
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.get("/api/releases/{release_id}/notifications", response_model=list[ReminderStateResponse])
    def get_release_notifications(
        release_id: int,
        as_of: date | None = None,
        storage: BoaStorage = Depends(get_storage),
    ) -> list[ReminderStateResponse]:
        effective_as_of = as_of or date.today()
        if as_of is None:
            storage.generate_due_notifications(as_of=effective_as_of)
        try:
            states = storage.list_release_reminder_states(release_id, as_of=effective_as_of)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return [_reminder_state_response(item) for item in states]

    @app.put("/api/releases/{release_id}", response_model=ReleaseResponse)
    def update_release(
        release_id: int,
        request: ReleaseUpdateRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> ReleaseResponse:
        try:
            release = storage.update_release(
                release_id,
                ReleaseBlueprint(
                    product=request.product,
                    version=request.version,
                    secret=request.secret,
                    milestones=storage.get_release(release_id).blueprint.milestones,
                ),
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return _release_response(storage, release)

    @app.delete("/api/releases/{release_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_release(
        release_id: int,
        storage: BoaStorage = Depends(get_storage),
    ) -> None:
        try:
            storage.delete_release(release_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.post(
        "/api/releases/{release_id}/milestones",
        response_model=MilestoneResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def add_milestone(
        release_id: int,
        request: MilestoneCreateRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> MilestoneResponse:
        try:
            milestone = storage.add_milestone(
                release_id,
                Milestone(name=request.name, expected=request.expected, owner=request.owner),
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return _milestone_response(milestone)

    @app.put("/api/milestones/{milestone_id}", response_model=MilestoneResponse)
    def update_milestone(
        milestone_id: int,
        request: MilestoneUpdateRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> MilestoneResponse:
        try:
            milestone = storage.update_milestone(
                milestone_id,
                Milestone(name=request.name, expected=request.expected, owner=request.owner),
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return _milestone_response(milestone)

    @app.delete("/api/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_milestone(
        milestone_id: int,
        storage: BoaStorage = Depends(get_storage),
    ) -> None:
        try:
            storage.delete_milestone(milestone_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.get("/api/milestones/{milestone_id}/notifications", response_model=ReminderStateResponse)
    def get_milestone_notifications(
        milestone_id: int,
        as_of: date | None = None,
        storage: BoaStorage = Depends(get_storage),
    ) -> ReminderStateResponse:
        effective_as_of = as_of or date.today()
        if as_of is None:
            storage.generate_due_notifications(as_of=effective_as_of)
        try:
            state = storage.get_milestone_reminder_state(milestone_id, as_of=effective_as_of)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return _reminder_state_response(state)

    @app.post("/api/milestones/{milestone_id}/ack", response_model=AckResponse)
    def ack_milestone(
        milestone_id: int,
        request: AckRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> AckResponse:
        try:
            milestone = storage.get_milestone(milestone_id)
            release = storage.get_release(milestone.release_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        if request.secret != release.blueprint.secret:
            raise HTTPException(status_code=403, detail="Invalid release secret.")

        ack = storage.ack_milestone(milestone_id, request.note.strip())
        return AckResponse(acked=True, acked_at=ack.acked_at.isoformat(), note=ack.note)

    @app.post(
        "/api/releases/{release_id}/bug-snapshots",
        response_model=BugSnapshotResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def add_bug_snapshot(
        release_id: int,
        request: BugSnapshotCreateRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> BugSnapshotResponse:
        try:
            snapshot = storage.add_bug_snapshot(
                release_id,
                open_bug_count=request.open_bug_count,
                signal_type=request.signal_type,
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return BugSnapshotResponse(
            id=snapshot.id,
            observed_at=snapshot.observed_at.isoformat(),
            signal_type=snapshot.signal_type,
            open_bug_count=snapshot.open_bug_count,
            quality=snapshot.quality,
            quality_reason=snapshot.quality_reason,
        )

    @app.get("/api/releases/{release_id}/bug-snapshots", response_model=list[BugSnapshotResponse])
    def list_bug_snapshots(
        release_id: int,
        storage: BoaStorage = Depends(get_storage),
    ) -> list[BugSnapshotResponse]:
        try:
            snapshots = storage.list_bug_snapshots(release_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return [
            BugSnapshotResponse(
                id=snapshot.id,
                observed_at=snapshot.observed_at.isoformat(),
                signal_type=snapshot.signal_type,
                open_bug_count=snapshot.open_bug_count,
                quality=snapshot.quality,
                quality_reason=snapshot.quality_reason,
            )
            for snapshot in snapshots
        ]

    @app.get("/api/releases/{release_id}/starlight", response_model=ReleaseStarlightResponse)
    def get_release_starlight(
        release_id: int,
        storage: BoaStorage = Depends(get_storage),
    ) -> ReleaseStarlightResponse:
        try:
            release = storage.get_release(release_id)
            starlight = storage.get_release_starlight(release_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        if starlight is None:
            raise HTTPException(status_code=404, detail=f"Release {release_id} has no starlight yet.")
        return _release_starlight_response(release, starlight)

    @app.post(
        "/api/releases/{release_id}/starlight",
        response_model=ReleaseStarlightResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def update_release_starlight(
        release_id: int,
        request: StarlightUpdateRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> ReleaseStarlightResponse:
        try:
            release = storage.get_release(release_id)
            starlight = storage.update_release_starlight(
                release_id,
                starlight=request.starlight,
                whisper=request.whisper,
                detail=StarlightDetail(
                    type=request.detail.type,
                    content=request.detail.content,
                ),
                metrics=(
                    StarlightMetrics(
                        done=request.metrics.done,
                        total=request.metrics.total,
                        blocked=request.metrics.blocked,
                    )
                    if request.metrics is not None
                    else None
                ),
                observed_on=request.observed_on or date.today(),
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return _release_starlight_response(release, starlight)

    @app.post("/api/notifications/run", response_model=list[NotificationResponse])
    def run_notifications(
        request: ReminderRunRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> list[NotificationResponse]:
        notifications = storage.generate_due_notifications(as_of=request.as_of)
        return [_notification_response(item) for item in notifications]

    @app.get("/api/releases/{release_id}/export", response_class=PlainTextResponse)
    def export_release(
        release_id: int,
        storage: BoaStorage = Depends(get_storage),
    ) -> str:
        try:
            release = storage.get_release(release_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return dump_release_blueprint(release.blueprint)

    @app.post("/api/releases/import", response_model=ReleaseResponse, status_code=status.HTTP_201_CREATED)
    async def import_release(
        storage: BoaStorage = Depends(get_storage),
        file: UploadFile = File(...),
        keep_original: bool = Form(False),
        shift_timeline: bool = Form(False),
        new_kickoff_date: date | None = Form(None),
    ) -> ReleaseResponse:
        try:
            yaml_text = (await file.read()).decode("utf-8")
            effective_shift_timeline = shift_timeline and not keep_original
            effective_kickoff_date = None if keep_original else new_kickoff_date
            blueprint = load_release_blueprint(
                yaml_text,
                shift_timeline=effective_shift_timeline,
                new_kickoff_date=effective_kickoff_date,
            )
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=400, detail="Uploaded file must be UTF-8 text.") from exc
        except BlueprintValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        try:
            release = storage.create_release(blueprint)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return _release_response(storage, release)

    @app.post("/api/releases/import/preview", response_model=ReleaseBlueprintResponse)
    async def preview_imported_release(
        file: UploadFile = File(...),
        keep_original: bool = Form(False),
        shift_timeline: bool = Form(False),
        new_kickoff_date: date | None = Form(None),
    ) -> ReleaseBlueprintResponse:
        try:
            yaml_text = (await file.read()).decode("utf-8")
            effective_shift_timeline = shift_timeline and not keep_original
            effective_kickoff_date = None if keep_original else new_kickoff_date
            blueprint = load_release_blueprint(
                yaml_text,
                shift_timeline=effective_shift_timeline,
                new_kickoff_date=effective_kickoff_date,
            )
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=400, detail="Uploaded file must be UTF-8 text.") from exc
        except BlueprintValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return _blueprint_response(blueprint)

    @app.post(
        "/api/plugins/{plugin_name}/releases/{release_id}/bug-snapshots",
        response_model=BugSnapshotResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def run_bug_snapshot_plugin(
        plugin_name: str,
        release_id: int,
        request: BugSnapshotCreateRequest,
        storage: BoaStorage = Depends(get_storage),
    ) -> BugSnapshotResponse:
        try:
            snapshot = storage.run_bug_snapshot_plugin(
                plugin_name,
                release_id,
                BugSnapshotSubmission(
                    open_bug_count=request.open_bug_count,
                    signal_type=request.signal_type,
                ),
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return BugSnapshotResponse(
            id=snapshot.id,
            observed_at=snapshot.observed_at.isoformat(),
            signal_type=snapshot.signal_type,
            open_bug_count=snapshot.open_bug_count,
            quality=snapshot.quality,
            quality_reason=snapshot.quality_reason,
        )

    return app


def _journey_fold_days() -> int:
    raw_value = os.getenv("BOA_JOURNEY_FOLD_DAYS") or os.getenv("BOA_STALE_KICKOFF_DAYS", "15")
    try:
        days = int(raw_value)
    except ValueError:
        return 15
    return max(days, 0)


def _release_response(storage: BoaStorage, release: ReleaseRecord) -> ReleaseResponse:
    return ReleaseResponse(
        id=release.id,
        product=release.blueprint.product,
        version=release.blueprint.version,
        secret=release.blueprint.secret,
        milestones=[
            _milestone_response(milestone)
            for milestone in storage.list_milestones(release.id)
        ],
    )


def _blueprint_response(blueprint: ReleaseBlueprint) -> ReleaseBlueprintResponse:
    return ReleaseBlueprintResponse(
        product=blueprint.product,
        version=blueprint.version,
        secret=blueprint.secret,
        milestones=[
            _milestone_response(milestone)
            for milestone in blueprint.milestones
        ],
    )


def _milestone_response(milestone: Milestone | MilestoneRecord) -> MilestoneResponse:
    return MilestoneResponse(
        id=getattr(milestone, "id", None),
        name=milestone.name,
        expected=milestone.expected,
        owner=milestone.owner,
    )


def _notification_response(notification: NotificationRecord) -> NotificationResponse:
    return NotificationResponse(
        id=notification.id,
        release_id=notification.release_id,
        milestone_id=notification.milestone_id,
        type=notification.type,
        sent_at=notification.sent_at.isoformat(),
    )


def _reminder_state_response(state: ReminderState) -> ReminderStateResponse:
    return ReminderStateResponse(
        release_id=state.release_id,
        milestone_id=state.milestone_id,
        milestone_name=state.milestone_name,
        expected=state.expected,
        owner=state.owner,
        acked_at=state.acked_at.isoformat() if state.acked_at else None,
        pending_types=list(state.pending_types),
        notifications=[_notification_response(item) for item in state.notifications],
    )


def _plugin_response(plugin: PluginDescriptor) -> PluginDescriptorResponse:
    return PluginDescriptorResponse(
        name=plugin.name,
        version=plugin.version,
        capabilities=list(plugin.capabilities),
        endpoint=plugin.endpoint,
    )


def _timeline_response(timeline: ReleaseTimeline) -> ReleaseTimelineResponse:
    return ReleaseTimelineResponse(
        id=timeline.release.id,
        product=timeline.release.blueprint.product,
        version=timeline.release.blueprint.version,
        secret=timeline.release.blueprint.secret,
        milestones=[
            TimelineMilestoneResponse(
                id=milestone.id,
                name=milestone.name,
                expected=milestone.expected,
                owner=milestone.owner,
                acked_at=milestone.acked_at.isoformat() if milestone.acked_at else None,
                ack_note=milestone.ack_note,
            )
            for milestone in timeline.milestones
        ],
        bug_snapshots=[
            BugSnapshotResponse(
                id=snapshot.id,
                observed_at=snapshot.observed_at.isoformat(),
                signal_type=snapshot.signal_type,
                open_bug_count=snapshot.open_bug_count,
                quality=snapshot.quality,
                quality_reason=snapshot.quality_reason,
            )
            for snapshot in timeline.bug_snapshots
        ],
        starlight=_starlight_status_response(timeline.starlight.current) if timeline.starlight else None,
        starlight_trail=[
            _starlight_event_response(event)
            for event in (timeline.starlight.trail if timeline.starlight else ())
        ],
    )


def _starlight_detail_response(detail: StarlightDetail) -> StarlightDetailResponse:
    return StarlightDetailResponse(
        type=detail.type,
        content=detail.content,
    )


def _starlight_metrics_response(metrics: StarlightMetrics | None) -> StarlightMetricsResponse | None:
    if metrics is None:
        return None
    return StarlightMetricsResponse(
        done=metrics.done,
        total=metrics.total,
        blocked=metrics.blocked,
    )


def _starlight_status_response(status: StarlightStatus) -> StarlightStatusResponse:
    return StarlightStatusResponse(
        release_id=status.release_id,
        starlight=status.starlight,
        whisper=status.whisper,
        detail=_starlight_detail_response(status.detail),
        metrics=_starlight_metrics_response(status.metrics),
        observed_on=status.observed_on,
        updated_at=status.updated_at.isoformat(),
    )


def _starlight_event_response(event: StarlightEvent) -> StarlightEventResponse:
    return StarlightEventResponse(
        date=event.observed_on,
        starlight=event.starlight,
        whisper=event.whisper,
        detail=_starlight_detail_response(event.detail),
        metrics=_starlight_metrics_response(event.metrics),
    )


def _release_starlight_response(
    release: ReleaseRecord,
    starlight: ReleaseStarlight,
) -> ReleaseStarlightResponse:
    return ReleaseStarlightResponse(
        release=f"{release.blueprint.product}-{release.blueprint.version}",
        starlight=starlight.current.starlight,
        whisper=starlight.current.whisper,
        detail=_starlight_detail_response(starlight.current.detail),
        metrics=_starlight_metrics_response(starlight.current.metrics),
        observed_on=starlight.current.observed_on,
        trail=[_starlight_event_response(event) for event in starlight.trail],
    )
