// 게임 손맛을 정하는 숫자들. 길이 단위는 게임 픽셀, 시간 단위는 초.

export const WORLD_WIDTH = 480;
export const WORLD_HEIGHT = 480;

export const PLAYER_RADIUS = 4;
export const PLAYER_SPEED = 60;
export const INPUT_DEADZONE = 0.12;

export const BALL_START_RADIUS = 4;
export const BALL_MAX_RADIUS = 22;
/** 1픽셀 굴릴 때마다 커지는 반지름 */
export const BALL_GROWTH_PER_PIXEL = 0.03;
/** 가장 큰 눈덩이를 밀 때 느려지는 비율 (0.7이면 최대 크기에서 원래 속도의 30%) */
export const HEAVY_BALL_SLOWDOWN = 0.7;

/** 위아래 눈덩이가 겹치는 정도 (1이면 딱 붙고, 작을수록 많이 겹침) */
export const STACK_OVERLAP = 0.8;
export const MAX_STACK_HEIGHT = 4;
/** 눈사람 쪽으로 이만큼 계속 밀어야 위로 올라간다 */
export const STACK_PUSH_SECONDS = 0.5;
/** 정면으로 미는지 판단하는 기준 (cos 값) */
export const HEAD_ON_THRESHOLD = 0.75;
export const LIFT_SECONDS = 0.6;

export const MIN_LOOSE_BALLS = 8;
export const SPAWN_INTERVAL_SECONDS = 2;

/** 부수기 버튼을 이만큼 꾹 눌러야 부서진다 */
export const BREAK_HOLD_SECONDS = 0.7;
/** 부서진 조각이 날아가 자리 잡는 시간 */
export const POP_SECONDS = 0.55;
/** 부서지는 순간 화면이 멈추는 시간 (히트스톱) */
export const HIT_STOP_SECONDS = 0.07;

/**
 * 이 거리 안의 눈사람에 완성/부수기 버튼이 뜬다.
 * 쌓는 순간 캐릭터는 굴리던 눈덩이 뒤에 서 있다가 그 눈덩이가 위로 올라가면 그만큼 떨어지므로, 그 자리에서도 뜨게 넉넉히 둔다
 */
export const NEARBY_STACK_DISTANCE = 24;
