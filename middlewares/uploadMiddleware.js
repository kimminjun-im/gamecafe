const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 업로드 대상 디렉토리
const profileUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles');
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

// 1. 디스크 스토리지 설정 (파일명 난수화로 파일 덮어쓰기 및 경로 조작 공격 방지)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// 2. 파일 형식 검증 (jpg, jpeg, png, gif, webp 허용)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.mimetype.startsWith('image/') && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일(jpg, jpeg, png, gif, webp)만 업로드할 수 있습니다.'), false);
  }
};

// 3. 용량 제한 (최대 5MB)
const uploadProfile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = {
  uploadProfile
};
