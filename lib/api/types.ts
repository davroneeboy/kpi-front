/** Django REST tipik javob — maydonlar backendga moslashishi mumkin */

export type ApiUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  /** Ba'zi backendlar `GET/POST /api/auth/login/` javobida qo'shadi */
  full_name?: string | null;
  is_staff?: boolean;
};

/** GET/PATCH /api/me/ — profil (maydonlar backendga moslashishi mumkin) */
export type ApiMe = ApiUser & {
  middle_name?: string | null;
  /** Matn yoki `{ name }` (Django FK serializatsiyasi) */
  department?: string | { id?: number; name?: string } | null;
  department_name?: string | null;
};

export type LoginResponse = {
  access: string;
  refresh: string;
  user: ApiUser;
};

export type TokenRefreshResponse = {
  access: string;
  refresh?: string;
};

/** GET /api/tests/ */
export type ApiTest = {
  id: number;
  title: string;
  description?: string | null;
  /** Backend nomlari farq qilishi mumkin */
  conducted_at?: string | null;
  conduct_starts_at?: string | null;
  conduct_ends_at?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean;
  question_count?: number;
  duration_minutes?: number | null;
  duration_seconds?: number | null;
  time_limit_minutes?: number | null;
  time_limit_seconds?: number | null;
};

/** Variant — POST/PUT/PATCH; har savolda aynan bitta `is_correct: true` */
export type ApiTestOptionWrite = {
  id?: number;
  text: string;
  is_correct: boolean;
};

/** Savol — yaratish/yangilash */
export type ApiTestQuestionWrite = {
  id?: number;
  text: string;
  order?: number;
  options: ApiTestOptionWrite[];
};

/** POST /api/tests/, PUT/PATCH /api/tests/<id>/ — to'liq JSON (backend sxemasiga qo'shimcha maydonlar bo'lishi mumkin) */
export type ApiTestUpsertPayload = {
  title: string;
  description?: string | null;
  is_active?: boolean;
  questions: ApiTestQuestionWrite[];
  [key: string]: unknown;
};

/** GET /api/tests/<id>/ — oddiy foydalanuvchi: variantlarda `is_correct` bo'lmasligi mumkin */
export type ApiTestOptionDetail = {
  id: number;
  text: string;
  is_correct?: boolean;
};

export type ApiTestQuestionDetail = {
  id: number;
  text: string;
  order?: number;
  options: ApiTestOptionDetail[];
};

/** Staff uchun GET — odatda `is_correct` bor; oddiy user uchun yo'q */
export type ApiTestDetail = ApiTest & {
  questions: ApiTestQuestionDetail[];
};

/** GET /api/attempts/ */
export type ApiAttempt = {
  id: number;
  status: string;
  username?: string | null;
  full_name?: string | null;
  score?: number | null;
  percentage?: number | null;
  score_percent?: number | null;
  score_earned?: string | number | null;
  score_max?: string | number | null;
  started_at?: string | null;
  completed_at?: string | null;
  finished_at?: string | null;
  test?: number | { id: number; title: string } | null;
  test_id?: number | null;
  test_title?: string | null;
};

export type ApiAttemptResponseItem = {
  question_id: number;
  selected_option_id: number;
};

/** GET /api/attempts/<id>/ — vaqt tekshiruvi, qolgan soniya va h.k. */
export type ApiAttemptDetail = ApiAttempt & {
  server_time?: string;
  seconds_remaining?: number | null;
  questions?: ApiTestQuestionDetail[];
  questions_total?: number;
  questions_answered?: number;
  answered_question_ids?: number[];
  responses?: ApiAttemptResponseItem[];
  next_question?: ApiTestQuestionDetail | null;
};

export type ApiErrorBody = {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
};
