import type { RehabilitationPlanStatus } from '@repo/contracts';

export const planStatusLabel = (status: RehabilitationPlanStatus): string =>
  ({
    DRAFT: 'Чернетка',
    ACTIVE: 'Активний',
    PAUSED: 'Призупинено',
    COMPLETED: 'Завершено',
    CANCELLED: 'Скасовано',
  })[status];

export const rehabilitationErrorMessage = (code?: string): string =>
  ({
    REHABILITATION_PLAN_UPDATE_CONFLICT: 'План уже змінився. Оновіть сторінку та повторіть дію.',
    REHABILITATION_PLAN_INVALID_TRANSITION: 'Ця зміна статусу зараз недоступна.',
    REHABILITATION_PLAN_NOT_EDITABLE:
      'Опубліковану редакцію не можна змінювати. Створіть нову редакцію.',
    REHABILITATION_PLAN_INCOMPLETE:
      'Для активації потрібна щонайменше одна ціль або призначена вправа.',
    REHABILITATION_PLAN_DRAFT_EXISTS: 'Для цього плану вже існує чернетка редакції.',
    REHABILITATION_PLAN_NOT_FOUND: 'План не знайдено або він недоступний у вашій організації.',
    REHABILITATION_GOAL_INVALID_TARGET:
      'Числова ціль має відповідати типу, одиниці та оператору показника.',
    REHABILITATION_GOAL_MEASUREMENT_MISMATCH:
      'Вихідне вимірювання не відповідає пацієнту або показнику цілі.',
    EXERCISE_NOT_FOUND: 'Вправу не знайдено або вона недоступна у вашій організації.',
    EXERCISE_NOT_AVAILABLE: 'Неактивну вправу не можна додати до нової редакції.',
    EXERCISE_PRESCRIPTION_INVALID_DOSAGE:
      'Перевірте дозування, сторону та параметри призначення вправи.',
    FORBIDDEN: 'У вас немає дозволу на цю дію.',
    VALIDATION_FAILED: 'Перевірте заповнені поля та дозування.',
  })[code ?? ''] ?? 'Не вдалося виконати дію. Спробуйте ще раз.';

export const EXERCISE_CATEGORY_LABELS: Record<string, string> = {
  MOBILITY: 'Мобільність',
  STRENGTH: 'Сила',
  STABILITY: 'Стабільність',
  BALANCE: 'Баланс',
  ENDURANCE: 'Витривалість',
  STRETCHING: 'Розтягнення',
  MOTOR_CONTROL: 'Моторний контроль',
  FUNCTIONAL: 'Функціональні',
  BREATHING: 'Дихання',
  OTHER: 'Інше',
};

export const REGION_LABELS: Record<string, string> = {
  shoulder: 'Плече',
  elbow: 'Лікоть',
  wrist: 'Зап’ясток і кисть',
  hip: 'Кульшовий суглоб',
  knee: 'Коліно',
  ankle: 'Гомілковостоп і стопа',
  cervical_spine: 'Шийний відділ',
  thoracic_spine: 'Грудний відділ',
  lumbar_spine: 'Поперековий відділ',
};

const MUSCLE_LABELS: Record<string, string> = {
  rotator_cuff: 'ротаторна манжета', deltoid: 'дельтоподібний', supraspinatus: 'надостьовий', infraspinatus: 'підостьовий',
  teres_minor: 'малий круглий', subscapularis: 'підлопатковий', pectoralis_major: 'великий грудний', serratus_anterior: 'передній зубчастий',
  rhomboids: 'ромбоподібні', middle_trapezius: 'середня трапеція', lower_trapezius: 'нижня трапеція', upper_trapezius: 'верхня трапеція',
  posterior_deltoid: 'задня дельта', biceps: 'біцепс', triceps: 'трицепс', pronator_teres: 'круглий привертач', supinator: 'супінатор',
  wrist_flexors: 'згиначі зап’ястка', wrist_extensors: 'розгиначі зап’ястка', finger_flexors: 'згиначі пальців', finger_extensors: 'розгиначі пальців',
  forearm: 'передпліччя', intrinsic_hand_muscles: 'власні м’язи кисті', gluteus_maximus: 'великий сідничний', gluteus_medius: 'середній сідничний',
  gluteus_minimus: 'малий сідничний', hamstrings: 'задня група стегна', quadriceps: 'квадрицепс', vastus_medialis: 'присередній широкий',
  adductors: 'привідні', iliopsoas: 'клубово-поперековий', hip_flexors: 'згиначі стегна', rectus_femoris: 'прямий м’яз стегна',
  tensor_fasciae_latae: 'натягувач широкої фасції', piriformis: 'грушоподібний', gastrocnemius: 'литковий', soleus: 'камбалоподібний',
  fibularis_longus: 'довгий малогомілковий', fibularis_brevis: 'короткий малогомілковий', tibialis_posterior: 'задній великогомілковий',
  tibialis_anterior: 'передній великогомілковий', ankle_stabilizers: 'стабілізатори гомілковостопа', intrinsic_foot_muscles: 'власні м’язи стопи',
  toe_flexors: 'згиначі пальців стопи', plantar_fascia: 'підошвова фасція', core: 'кор', deep_neck_flexors: 'глибокі згиначі шиї',
  neck_rotators: 'ротатори шиї', scalenes: 'драбинчасті', levator_scapulae: 'піднімач лопатки', erector_spinae: 'розгиначі спини',
  abdominals: 'м’язи живота', rectus_abdominis: 'прямий м’яз живота', transversus_abdominis: 'поперечний м’яз живота', multifidus: 'багатороздільні',
  obliques: 'косі м’язи живота', quadratus_lumborum: 'квадратний м’яз попереку', latissimus_dorsi: 'найширший м’яз спини',
  thoracic_rotators: 'ротатори грудного відділу', thoracic_extensors: 'розгиначі грудного відділу', diaphragm: 'діафрагма', intercostals: 'міжреберні',
  lower_limb: 'нижні кінцівки', cardiorespiratory: 'серцево-дихальна система', shoulder_girdle: 'плечовий пояс', trunk_muscles: 'м’язи тулуба',
};

export const categoryLabel = (code: string): string => EXERCISE_CATEGORY_LABELS[code] ?? code;
export const regionLabel = (code: string): string => REGION_LABELS[code] ?? code;
export const muscleLabel = (code: string): string => MUSCLE_LABELS[code] ?? code.replaceAll('_', ' ');
