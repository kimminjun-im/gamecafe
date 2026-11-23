-- ========================================================
-- GameCafe Database Schema (MySQL 8.4 LTS)
-- ========================================================

-- 1. 데이터베이스 생성 (이모지 지원 utf8mb4)
CREATE DATABASE IF NOT EXISTS gamecafe 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE gamecafe;

-- 2. 기존 테이블 삭제 (외래 키 종속성 역순)
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS post_images;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS board_categories;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS users;

-- 3. 회원 테이블
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(30) NOT NULL UNIQUE,
    profile_image VARCHAR(255) NOT NULL DEFAULT '/images/default-avatar.png',
    bio VARCHAR(150) NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    is_banned TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 게임 허브 테이블
CREATE TABLE games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    icon_image VARCHAR(255) NULL,
    banner_image VARCHAR(255) NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_games_display_order (display_order ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 게시판 카테고리 테이블
CREATE TABLE board_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    slug VARCHAR(30) NOT NULL UNIQUE,
    display_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 게시글 테이블
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NULL,
    category_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content LONGTEXT NOT NULL,
    view_count INT NOT NULL DEFAULT 0,
    like_count INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    notice_type ENUM('none', 'game', 'global') NOT NULL DEFAULT 'none',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 외래 키 제약조건
    CONSTRAINT fk_posts_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT,
    CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES board_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- MySQL 8.4 정합성 CHECK 제약조건
    CONSTRAINT chk_posts_notice_game CHECK (
        (notice_type = 'global' AND game_id IS NULL)
        OR
        (notice_type IN ('game', 'none') AND game_id IS NOT NULL)
    ),
    
    -- 인덱스
    INDEX idx_posts_game_cat_created (game_id, category_id, created_at DESC),
    INDEX idx_posts_notice (notice_type, created_at DESC),
    INDEX idx_posts_likes_created (like_count DESC, created_at DESC),
    INDEX idx_posts_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 게시글 첨부 다중 이미지 테이블
CREATE TABLE post_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_post_images_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post_images_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 댓글 및 대댓글 테이블
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT NULL,
    content TEXT NOT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    
    INDEX idx_comments_post_created (post_id, created_at ASC),
    INDEX idx_comments_parent (parent_id),
    INDEX idx_comments_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 게시글 좋아요 테이블
CREATE TABLE post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_post_user (post_id, user_id),
    INDEX idx_post_likes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
