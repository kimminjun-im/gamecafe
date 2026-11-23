-- ========================================================
-- GameCafe Migration: Add is_banned column to users table
-- 기존 회원 데이터를 안전하게 보존하면서 정지 플래그 컬럼 추가
-- ========================================================

USE gamecafe;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_banned TINYINT(1) NOT NULL DEFAULT 0 
AFTER role;
