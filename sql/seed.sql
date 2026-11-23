-- ========================================================
-- GameCafe Initial Seed Data (MySQL 8.4 LTS)
-- ========================================================

USE gamecafe;

-- 1. 카테고리 초기 데이터 (자유, 공략, 정보, 질문, 모집, 공지)
INSERT INTO board_categories (name, slug, display_order) VALUES
('공지사항', 'notice', 1),
('자유게시판', 'free', 2),
('공략게시판', 'guide', 3),
('정보게시판', 'info', 4),
('질문게시판', 'qna', 5),
('모집게시판', 'recruit', 6)
ON DUPLICATE KEY UPDATE name = VALUES(name), display_order = VALUES(display_order);

-- 2. 테스트용 게임 데이터 (리그 오브 레전드, 발로란트, 오버워치 2, 마인크래프트)
INSERT INTO games (name, slug, description, icon_image, banner_image, display_order) VALUES
('리그 오브 레전드', 'lol', '라이엇 게임즈의 대표 5:5 MOBA 게임 커뮤니티', '/images/games/lol-icon.png', '/images/games/lol-banner.jpg', 1),
('발로란트', 'valorant', '전술적 5:5 1인칭 캐릭터 기반 슈팅 게임', '/images/games/valorant-icon.png', '/images/games/valorant-banner.jpg', 2),
('오버워치 2', 'overwatch2', '블리자드의 팀 기반 액션 히어로 슈터', '/images/games/ow2-icon.png', '/images/games/ow2-banner.jpg', 3),
('마인크래프트', 'minecraft', '무한한 블록 세계를 탐험하고 창조하는 샌드박스 게임', '/images/games/mc-icon.png', '/images/games/mc-banner.jpg', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- 3. 초기 관리자 및 테스트 유저 데이터
-- 비밀번호: admin1234 / user1234 (bcrypt salt 10 해시값)
-- admin 해시: $2b$10$epvR5XgLh9153JqDkL275.cK.m97eB3rUu8m1U/6Jg3v6E5u9dZ2a
-- user 해시: $2b$10$dY9p4q.vB1rJ6W1tYwzL7.mQv7Pz8c1K.7N1W9o5B3u8E2r4T6y8u
INSERT INTO users (email, password, nickname, role, bio) VALUES
('admin@gamecafe.com', '$2b$10$epvR5XgLh9153JqDkL275.cK.m97eB3rUu8m1U/6Jg3v6E5u9dZ2a', '운영자', 'admin', 'GameCafe 공식 운영자 계정입니다.'),
('gamer1@gamecafe.com', '$2b$10$dY9p4q.vB1rJ6W1tYwzL7.mQv7Pz8c1K.7N1W9o5B3u8E2r4T6y8u', '페이커꿈나무', 'user', '리그 오브 레전드 미드 라이너입니다.'),
('shooter@gamecafe.com', '$2b$10$dY9p4q.vB1rJ6W1tYwzL7.mQv7Pz8c1K.7N1W9o5B3u8E2r4T6y8u', '헤드헌터', 'user', '발로란트 레디언트를 목표로 달립니다.')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

-- 4. 초기 샘플 게시글 데이터 (전체 공지 및 게임별 글)
-- 1) 사이트 전체 공지 (game_id = NULL, notice_type = 'global', category_id = 1 (공지사항))
INSERT INTO posts (game_id, category_id, user_id, title, content, notice_type, view_count, like_count) VALUES
(NULL, 1, 1, '📢 GameCafe 게임 커뮤니티에 오신 것을 환영합니다!', '<p>GameCafe는 다양한 게임의 유저들이 모여 공략, 정보, 파티 모집 등을 나누는 종합 게임 커뮤니티입니다.<br>건전하고 즐거운 소통 문화를 만들어 나가요!</p>', 'global', 128, 15);

-- 2) 리그 오브 레전드 게임별 공지 (game_id = 1, notice_type = 'game', category_id = 1)
INSERT INTO posts (game_id, category_id, user_id, title, content, notice_type, view_count, like_count) VALUES
(1, 1, 1, '⚡ [LOL 공지] 리그 오브 레전드 게시판 이용 수칙 안내', '<p>LOL 라운지에서는 비매너 욕설 및 티어 비하 발언을 엄격히 금지합니다.<br>패치 노트와 챔피언 공략을 자유롭게 공유해 주세요.</p>', 'game', 95, 10);

-- 3) 리그 오브 레전드 일반 공략글 (game_id = 1, notice_type = 'none', category_id = 3 (공략))
INSERT INTO posts (game_id, category_id, user_id, title, content, notice_type, view_count, like_count) VALUES
(1, 3, 2, '초보자도 따라하기 쉬운 미드 아리 룬/템트리 완벽 가이드', '<p>이번 시즌 감전 아리 운영법을 정리해 보았습니다.<br>1. 라인전 초반 딜교환 팁<br>2. 궁극기 진입 타이밍<br>질문은 댓글로 남겨주세요!</p>', 'none', 342, 28);

-- 4) 발로란트 파티 모집글 (game_id = 2, notice_type = 'none', category_id = 6 (모집))
INSERT INTO posts (game_id, category_id, user_id, title, content, notice_type, view_count, like_count) VALUES
(2, 6, 3, '[발로란트] 오늘 밤 경쟁전 5인큐 다이아~초월자 구합니다 (1/5)', '<p>디스코드 마이크 필수, 멘탈 좋으신 분 환영합니다!<br>댓글이나 프로필 보고 친추 주세요.</p>', 'none', 76, 5);
