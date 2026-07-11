-- Keep the polling fallback independent from process-local SSE state.
-- The monotonically increasing revision also prevents same-millisecond updates
-- and out-of-order polling responses from being mistaken for new changes.
ALTER TABLE "households"
ADD COLUMN "realtime_revision" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "realtime_actor_client_id" VARCHAR(128),
ADD COLUMN "realtime_actor_user_id" TEXT;
