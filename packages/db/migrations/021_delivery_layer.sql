-- Migration 021: Delivery layer for services
-- Adds delivery/pickup/in-venue flags + cost as a cross-cutting layer over all service types

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS has_delivery    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allows_pickup   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allows_in_venue BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_cost   NUMERIC(10,2) NOT NULL DEFAULT 0;
