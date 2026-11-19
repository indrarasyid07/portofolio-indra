# 06 — Skema Database dan Migrasi

**DB:** PostgreSQL (Neon) · **PK:** UUID unless called out · **timestamps:** `timestamptz` UTC · **status:** `draft | published`.

## ERD

```mermaid
erDiagram
  ADMIN_USERS ||--o{ ADMIN_SESSIONS : owns
  ADMIN_USERS ||--o{ SECURITY_EVENTS : generates
  ADMIN_USERS ||--o{ MEDIA_ASSETS : uploads
  PROFILES ||--o| MEDIA_ASSETS : portrait
  PROJECTS ||--o{ PROJECT_IMAGES : contains
  MEDIA_ASSETS ||--o| PROJECT_IMAGES : referenced_by
  PROJECTS }o--o{ SKILLS : uses
  SKILL_CATEGORIES ||--o{ SKILLS : groups

  ADMIN_USERS { uuid id PK string username UK string password_hash bool is_active timestamptz created_at timestamptz updated_at }
  ADMIN_SESSIONS { uuid id PK uuid admin_user_id FK string token_hash UK timestamptz created_at timestamptz last_seen_at timestamptz expires_at timestamptz revoked_at }
  SECURITY_EVENTS { uuid id PK uuid admin_user_id FK nullable string event_type string attempt_key_hash nullable timestamptz occurred_at jsonb safe_metadata }
  PROFILES { smallint id PK string name string role string headline string intro text about string status string portrait_asset_id FK nullable string public_email nullable string github_url nullable string linkedin_url nullable string cv_url nullable timestamptz published_at nullable timestamptz updated_at }
  PROJECTS { uuid id PK string slug UK string title string subtitle string project_type int year string role text summary text challenge text solution text outcome string demo_url nullable string repository_url nullable bool featured string status int sort_order timestamptz published_at nullable timestamptz created_at timestamptz updated_at }
  MEDIA_ASSETS { uuid id PK string object_key UK string bucket string content_type int byte_size int width int height string sha256 string state string original_filename string alt_text string caption uuid uploaded_by FK timestamptz created_at timestamptz delete_after nullable }
  PROJECT_IMAGES { uuid project_id PK FK uuid media_asset_id PK FK int sort_order bool is_cover timestamptz created_at }
  EXPERIENCES { uuid id PK string role string organization string employment_type string location smallint start_year smallint start_month nullable smallint end_year nullable smallint end_month nullable text summary jsonb highlights string status int sort_order timestamptz published_at nullable }
  EDUCATION_RECORDS { uuid id PK string kind string title string institution smallint start_year nullable smallint start_month nullable smallint end_year nullable smallint end_month nullable text description string proof_url nullable string credential_id nullable string status int sort_order timestamptz published_at nullable }
  SKILL_CATEGORIES { uuid id PK string slug UK string label int sort_order bool is_published }
  SKILLS { uuid id PK uuid category_id FK string name string note string status int sort_order timestamptz created_at timestamptz updated_at }
  PROJECT_SKILLS { uuid project_id PK FK uuid skill_id PK FK int sort_order string name_snapshot }
  LOGIN_ATTEMPTS { uuid id PK string attempt_key_hash timestamptz attempted_at string outcome }
```

`security_events` may consolidate login attempts and audit events if query/rate-control behavior is proven correct. Separate `login_attempts` is safer/easier for sliding-window counters at first; see decision below. Entity names can shift while preserving invariants.

## Table definitions and deletion behavior

| Table | Fields and constraints | Index/relationship | Delete behavior |
|---|---|---|---|
| `profiles` | Singleton `id=1` CHECK; `name NOT NULL`; role/headline/intro/about; availability; `portrait_asset_id` nullable; contact links; `status`; `published_at`; `updated_at`. No password/session field. Private recipient email may be different from public email. | one row seeded as draft/empty; public profile query requires `published`; FK to media `ON DELETE SET NULL` only after object cleanup. | Never cascade delete singleton from admin UI. |
| `projects` | `slug` unique lower/hyphen; title/summary/long sections; type enum; year; role; optional demo/repo; `featured`; `status`; `sort_order`; timestamps; `published_at`. DB partial unique index allows at most one row where `featured AND status='published'`; service transaction clears prior featured flag before enabling a new one. | unique slug; `(status, sort_order, published_at DESC)`; partial unique index on `featured WHERE status='published' AND featured`. | Delete project hard only after confirmation; FK `project_images` + `project_skills` cascade associations, not underlying shared media. Optional tombstone/soft-delete is a product choice; MVP unpublish first. |
| `project_images` | composite PK `(project_id, media_asset_id)`; `sort_order >=0`; `is_cover`; at most one cover per project using partial unique index. | FK project cascade; media FK restrict until service unlinks; unique `(project_id, sort_order)`. | Remove link first; schedule media delete only if no references. |
| `experiences` | role, organization, employment type enum, location, `start_date`, nullable `end_date`, summary, JSONB array of highlights or child table, status, order and timestamps. `CHECK end_date IS NULL OR end_date >= start_date`. | `(status, sort_order, start_date DESC)`. | Draft/published status does not create duplicated data. Hard delete confirmed; audit event retained without copy of full personal text. |
| `education_records` | `kind= formal/course/certification`; title/institution; date range; description; proof URL; credential ID; publication and sort fields. | `(kind,status,sort_order,start_date DESC)`. | Delete record; do not delete external credential evidence. |
| `skill_categories` | Unique slug, label, sort order, publication boolean. | unique slug; sort index. | Restrict while skills depend; admin reassigns or deletes children explicitly. |
| `skills` | category FK, name, note/usage context, status, sort and timestamps. | `(category_id,status,sort_order)`, unique normalized name per category. | `project_skills.skill_id` RESTRICT; explicit unlink confirmation avoids losing project detail. |
| `project_skills` | Composite PK `(project_id,skill_id)`, ordered relation; `name_snapshot` optionally preserves label if skill renamed/deleted. | FKs; unique `(project_id,sort_order)`. | Cascade on project deletion; on skill deletion restrict until mapping decision. |
| `media_assets` | random UUID key; object key unique; bucket/type/bytes/dimensions/SHA-256/state `pending/ready/rejected/deleting`; original filename sanitized; alt/caption; creator; timestamps; optional expiry. | unique object key; `(state,delete_after)` cleanup query; FK admin `SET NULL` for retention. | DB row and object deletion are separate; outbox/retry or scheduled reconciliation prevents orphaned object. |
| `admin_users` | Unique normalized username; password hash only; active bool; created/updated; optional password_changed_at. Single-row invariant enforced by bootstrap/service/DB unique singleton key; no public signup. | unique lower username. | Keep at most one active row. Disable or replace using controlled script; never allow public delete. |
| `admin_sessions` | FK user, `token_hash` unique (HMAC-SHA-256 keyed by `SESSION_HASH_KEY` over 256-bit random token), created/last_seen/expiry/revoked; optional user-agent hash and IP HMAC (minimize retention). | indexed token hash, expiry; user + active/revoked. | FK cascade when admin permanently removed; periodic cleanup of revoked/expired sessions. |
| `login_attempts` | HMAC `attempt_key_hash` (username/IP composite key), `attempted_at`, outcome enum, small `source` enum. Do not store raw IP; key secret in environment. | `(attempt_key_hash, attempted_at DESC)`; prune rows. | Delete rows older than retention window (proposal 7 days). Never use row count race without a transaction/atomic policy. |
| `audit_events` (optional MVP) | Admin actor, action enum, entity kind/id, time, request id and limited changed field names. No password/token or full form body. | `(occurred_at DESC)`, entity reference index. | Retention proposal 90 days pending review; security event retention may differ. |

## Logical column dictionary

Types below map to PostgreSQL (`uuid`, `text`, `varchar`, `boolean`, `integer`, `smallint`, `date`, `timestamptz`, `jsonb`, `bytea` only if a future encryption design requires it). Enum values should initially be `VARCHAR` plus a `CHECK` or PostgreSQL enum migration policy; avoid changing native enums casually.

| Table | Column → type | Constraints / role |
|---|---|---|
| `profiles` | `id smallint`; `name varchar(120)`; `role varchar(160)`; `headline varchar(240)`; `intro varchar(600)`; `about text`; `location varchar(120) NULL`; `availability varchar(160) NULL`; `portrait_asset_id uuid NULL`; `public_email varchar(320) NULL`; `github_url text NULL`; `linkedin_url text NULL`; `cv_url text NULL`; `status varchar(12)`; `published_at timestamptz NULL`; `updated_at timestamptz`. | `id=1` CHECK/PK, status CHECK `draft|published`; optional links URL-validated in service/schema; email syntax validated, not unique. `portrait_asset_id` FK `media_assets.id`. Private email recipient omitted unless separate setting is required. |
| `projects` | `id uuid`; `slug varchar(140)`; `title varchar(120)`; `subtitle varchar(180) NULL`; `project_type varchar(32)`; `year smallint`; `role varchar(240)`; `summary varchar(600)`; `challenge text NULL`; `solution text NULL`; `outcome text NULL`; `demo_url text NULL`; `repository_url text NULL`; `featured boolean`; `status varchar(12)`; `sort_order integer`; `published_at timestamptz NULL`; `created_at/updated_at timestamptz`. | PK; unique slug; `year` 1900..current+1; status/type CHECK; sort_order >=0; URL allowlist at API boundary; partial unique featured index for published row. |
| `project_images` | `project_id uuid`; `media_asset_id uuid`; `sort_order integer`; `is_cover boolean`; `created_at timestamptz`. | Composite PK; both FKs; unique project/order; `sort_order>=0`; unique partial `(project_id) WHERE is_cover`. |
| `experiences` | `id uuid`; `role varchar(180)`; `organization varchar(180)`; `employment_type varchar(32)`; `location varchar(140) NULL`; `start_year smallint`; `start_month smallint NULL`; `end_year smallint NULL`; `end_month smallint NULL`; `summary varchar(2000)`; `highlights jsonb` (array of text); `status varchar(12)`; `sort_order integer`; `published_at timestamptz NULL`; `created_at/updated_at timestamptz`. | PK; status/employment CHECK; month 1–12; current job has end year/month null; end precision pair required together; end >= start via service or generated comparison check. Model avoids inventing day when source only has year/month. |
| `education_records` | `id uuid`; `kind varchar(20)`; `title varchar(180)`; `institution varchar(180)`; `start_year smallint NULL`; `start_month smallint NULL`; `end_year smallint NULL`; `end_month smallint NULL`; `description varchar(2000) NULL`; `proof_url text NULL`; `credential_id varchar(180) NULL`; `status varchar(12)`; `sort_order integer`; `published_at timestamptz NULL`; `created_at/updated_at timestamptz`. | PK; `kind IN(formal,course,certification)`; month/year bounds; proof URL valid HTTPS; no false issuer/date. |
| `skill_categories` | `id uuid`; `slug varchar(80)`; `label varchar(100)`; `sort_order integer`; `is_published boolean`; `created_at/updated_at timestamptz`. | PK, unique slug, `sort_order>=0`. |
| `skills` | `id uuid`; `category_id uuid`; `name varchar(100)`; `note varchar(240) NULL`; `status varchar(12)`; `sort_order integer`; `created_at/updated_at timestamptz`. | PK/FK; unique normalized `(category_id,name)`; status CHECK; `sort_order>=0`. |
| `project_skills` | `project_id uuid`; `skill_id uuid`; `sort_order integer`; `name_snapshot varchar(100)`. | Composite PK and FK; `sort_order>=0`; snapshot lets historical project keep display name even when general skill entry is unpublished/renamed. |
| `media_assets` | `id uuid`; `provider varchar(32)`; `bucket varchar(100)`; `object_key varchar(500)`; `content_type varchar(80)`; `byte_size bigint`; `width integer NULL`; `height integer NULL`; `sha256 char(64)`; `state varchar(16)`; `original_filename varchar(255)`; `alt_text varchar(180)`; `caption varchar(240) NULL`; `uploaded_by uuid NULL`; `created_at timestamptz`; `delete_after timestamptz NULL`. | PK; unique `(provider,bucket,object_key)`; provider/state/type CHECK; bytes >0; dimensions positive and pixel cap in app; FK admin nullable; title/alt policy enforced on publish. |
| `admin_users` | `id uuid`; `username varchar(80)`; `normalized_username varchar(80)`; `password_hash varchar(255)`; `is_active boolean`; `password_changed_at timestamptz NULL`; `created_at/updated_at timestamptz`. | PK; unique normalized username; password hash format validated by library; one-account policy enforced by bootstrap guard and possibly singleton key unique. |
| `admin_sessions` | `id uuid`; `admin_user_id uuid`; `token_hash char(64)`; `key_version smallint`; `csrf_hash char(64)` or session-bound CSRF secret; `created_at/last_seen_at/expires_at timestamptz`; `revoked_at timestamptz NULL`; `user_agent_hash char(64) NULL`. | PK; user FK cascade; unique token hash; expiry > created; indexes on token_hash and `(admin_user_id,expires_at)`; raw cookie/CSRF value never stored. |
| `login_attempts` | `id uuid`; `attempt_key_hash char(64)`; `source_key_hash char(64) NULL`; `attempted_at timestamptz`; `outcome varchar(16)`. | PK; HMAC keys only, no raw username/IP; indexes `(attempt_key_hash,attempted_at DESC)` and `(source_key_hash,attempted_at DESC)`; short retention. |
| `audit_events` | `id uuid`; `admin_user_id uuid NULL`; `action varchar(32)`; `entity_type varchar(32)`; `entity_id uuid NULL`; `request_id varchar(80)`; `occurred_at timestamptz`; `changed_fields jsonb NULL`. | PK; indexes time/entity; actor FK `SET NULL`; JSON contains field names only, not values/secrets. |

Add/rename columns to align exact implementation; schema review must agree with API types and date precision before revision `0001` is committed.

### Schema design choices

- `profile` is one configuration row; public vs private email must be explicit. If there's no need for a second recipient address, remove private recipient field rather than overdesign.
- Multiple image relationship belongs in `project_images` to maintain unique ordering and cover constraint. Asset is independent so portrait and project media share validation/cleanup logic.
- `PROJECT_SKILLS.name_snapshot` is optional. If project details should preserve exact historical technology after general skill list changes, use snapshot label in API/display and retain `skill_id` nullable with `ON DELETE SET NULL`; if the skill taxonomy is canonical, restrict deletion. This policy is open and must be decided before Alembic v1.
- Keep highlights as JSONB only if each bullet has no independent edit lifecycle/order metadata; otherwise `experience_highlights` child table. MVP can use JSONB with a Pydantic `list[str]` and DB type check. Same for project challenge/solution/outcome as columns.
- Use `DATE` for employment/education boundaries if source only provides years/months; use first day as an implementation convention only if UI hides artificial day. Better alternative: store start/end year and month nullable. Open in [13](13-operations-risks-and-open-questions.md).

## Migration rules

1. First Alembic revision creates tables/indexes/constraints; bootstrap script inserts no personal portfolio seed.
2. `alembic revision --autogenerate` produces a candidate; review both upgrade/downgrade; autogeneration is not a finished migration and can miss/approximate behavior. Do not run migrations at every function cold start; deployment release command runs once with direct URL.
3. Back up database before destructive migration; test upgrade from blank and previous supported revision; choose backward-compatible expand/migrate/contract for data shape changes.
4. Seed fixtures run only with explicit development/test command, use `sample=true` / separate test DB and never production. Bootstrap admin is a distinct command and prompts from stdin or secret manager; no default password.
5. Neon preview branch can be used for schema preview if branch data safety/privacy constraints allow. Branch is not equivalent to a durable backup.
6. Store timestamps UTC; UI formats `Asia/Jakarta` locale and labels dates precisely. Use DB server timestamps where practical.

## Session/rate indexes and consistency

Session token hash lookup unique, never query raw token. Expiry/revocation are checked on every request. Last-used writes may be throttled (e.g. only update if older than 5 min) to reduce write churn. Login attempt rate check + increment must be atomic under concurrency, perhaps advisory lock or `INSERT ... ON CONFLICT` bucket counters; detailed algorithm in [07](07-auth-security-and-threat-model.md). Avoid per-request IP raw storage.

References: [API contracts](05-backend-and-api-contract.md), [media flow](08-media-upload-and-storage.md), [auth](07-auth-security-and-threat-model.md).

Official implementation references: [SQLAlchemy 2.0 asyncio](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html), [Alembic autogenerate](https://alembic.sqlalchemy.org/en/latest/autogenerate.html). Alembic autogenerate emits candidate changes and requires human review.
