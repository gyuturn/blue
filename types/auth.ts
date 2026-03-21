export interface KakaoUser {
  id: number;
  kakao_account?: {
    profile?: {
      nickname: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
    email?: string;
  };
}

export interface SessionUser {
  id: string;
  nickname: string;
  profileImage: string;
}
